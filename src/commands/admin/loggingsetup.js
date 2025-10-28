const {
  ChannelType,
  ComponentType,
  ButtonStyle,
  TextInputStyle,
} = require("discord.js");
const GuildSettings = require("@schemas/Guild");
const InteractionUtils = require("@helpers/InteractionUtils");
const ContainerBuilder = require("@helpers/ContainerBuilder");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "loggingsetup",
  description: "Interactive server logging setup with modern UI",
  category: "LOGS",
  userPermissions: ["ManageGuild"],
  command: {
    enabled: true,
    usage: "",
    aliases: ["logs", "logsetup"],
  },
  slashCommand: {
    enabled: true,
    ephemeral: true,
  },

  async messageRun(message, args) {
    await showLoggingPanel(message, false);
  },

  async interactionRun(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await showLoggingPanel(interaction, true);
  },
};

/**
 * Show logging setup panel with container design
 */
async function showLoggingPanel(source, isInteraction) {
  const settings = await GuildSettings.findOne({ guildId: source.guild.id });
  
  const modlogChannel = settings?.modlog_channel
    ? `<#${settings.modlog_channel}>`
    : "Not configured";
  const automodChannel = settings?.automod?.log_channel
    ? `<#${settings.automod.log_channel}>`
    : "Not configured";
  
  const statusEmoji = (channelId) => channelId ? "<:success:1424072640829722745>" : "<:error:1424072711671382076>";
  
  const components = [];
  
  components.push(ContainerBuilder.createTextDisplay("# 📋 Logging Control Panel"));
  components.push(ContainerBuilder.createSeparator());
  
  components.push(ContainerBuilder.createTextDisplay(
    "## Channel Configuration\n" +
    "Configure where different types of logs are sent in your server."
  ));
  
  components.push(ContainerBuilder.createSeparator());
  
  components.push(ContainerBuilder.createTextDisplay(
    `**Moderation Log**\n` +
    `${statusEmoji(settings?.modlog_channel)} ${modlogChannel}\n` +
    `*Logs: bans, kicks, mutes, warnings, and other mod actions*`
  ));
  
  components.push(ContainerBuilder.createSeparator());
  
  components.push(ContainerBuilder.createTextDisplay(
    `**AutoMod Log**\n` +
    `${statusEmoji(settings?.automod?.log_channel)} ${automodChannel}\n` +
    `*Logs: spam detection, link removal, bad words, and automod violations*`
  ));
  
  components.push(ContainerBuilder.createSeparator());
  
  components.push(ContainerBuilder.createTextDisplay(
    "## Event Types Logged\n" +
    "• Moderation Actions (ban, kick, mute, warn)\n" +
    "• AutoMod Violations (spam, links, bad words)\n" +
    "• Member Events (join, leave, role changes)\n" +
    "• Message Events (edit, delete, bulk delete)"
  ));
  
  const buttonRow1 = InteractionUtils.createButtonRow([
    {
      customId: "log_modlog_set",
      label: "Set Mod Log",
      emoji: "🛡️",
      style: settings?.modlog_channel ? ButtonStyle.Success : ButtonStyle.Primary,
    },
    {
      customId: "log_automod_set",
      label: "Set AutoMod Log",
      emoji: "🤖",
      style: settings?.automod?.log_channel ? ButtonStyle.Success : ButtonStyle.Primary,
    },
  ]);
  
  const buttonRow2 = InteractionUtils.createButtonRow([
    {
      customId: "log_modlog_disable",
      label: "Disable Mod Log",
      emoji: "🔴",
      style: ButtonStyle.Danger,
      disabled: !settings?.modlog_channel,
    },
    {
      customId: "log_automod_disable",
      label: "Disable AutoMod Log",
      emoji: "🔴",
      style: ButtonStyle.Danger,
      disabled: !settings?.automod?.log_channel,
    },
  ]);
  
  const payload = new ContainerBuilder()
    .addContainer({
      accentColor: 0x5865F2,
      components: components
    })
    .build();
  
  payload.components.push(buttonRow1, buttonRow2);
  
  const msg = isInteraction
    ? await source.editReply(payload)
    : await source.safeReply(payload);
  
  setupCollector(msg, source, isInteraction);
}

/**
 * Setup collector
 */
function setupCollector(message, source, isInteraction) {
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === (isInteraction ? source.user.id : source.author.id),
    time: 300000,
  });
  
  collector.on("collect", async (interaction) => {
    try {
      switch (interaction.customId) {
        case "log_modlog_set":
          await handleModLogSetup(interaction);
          await showLoggingPanel(source, isInteraction);
          break;
        case "log_automod_set":
          await handleAutoModLogSetup(interaction);
          await showLoggingPanel(source, isInteraction);
          break;
        case "log_modlog_disable":
          await handleDisableModLog(interaction);
          await showLoggingPanel(source, isInteraction);
          break;
        case "log_automod_disable":
          await handleDisableAutoModLog(interaction);
          await showLoggingPanel(source, isInteraction);
          break;
      }
    } catch (error) {
      console.error("Logging setup error:", error);
      await interaction.reply({
        content: `❌ An error occurred: ${error.message}`,
        ephemeral: true,
      }).catch(() => {});
    }
  });
  
  collector.on("end", () => {
    if (message && message.components) {
      message.edit({
        components: InteractionUtils.disableComponents(message.components)
      }).catch(() => {});
    }
  });
}

/**
 * Handle mod log setup
 */
async function handleModLogSetup(interaction) {
  const modal = InteractionUtils.createModal(
    "modlog_channel_modal",
    "Set Moderation Log Channel",
    [
      {
        customId: "channel_id",
        label: "Channel ID",
        style: TextInputStyle.Short,
        placeholder: "Enter channel ID for moderation logs",
        required: true,
      },
    ]
  );
  
  await interaction.showModal(modal);
  
  const modalSubmit = await InteractionUtils.awaitModalSubmit(
    interaction,
    "modlog_channel_modal",
    120000
  );
  
  if (!modalSubmit) return;
  
  const channelId = modalSubmit.fields.getTextInputValue("channel_id");
  const channel = await interaction.guild.channels
    .fetch(channelId)
    .catch(() => null);
  
  if (!channel || channel.type !== ChannelType.GuildText) {
    return modalSubmit.reply({
      embeds: [InteractionUtils.createErrorEmbed("Invalid text channel ID!")],
      ephemeral: true,
    });
  }
  
  await GuildSettings.updateOne(
    { guildId: interaction.guild.id },
    {
      $set: {
        modlog_channel: channel.id,
      },
    },
    { upsert: true }
  );
  
  const components = [];
  components.push(ContainerBuilder.createTextDisplay("# ✅ Moderation Log Configured"));
  components.push(ContainerBuilder.createSeparator());
  components.push(ContainerBuilder.createTextDisplay(
    `**Channel:** ${channel}\n\n` +
    `All moderation actions will now be logged in this channel.`
  ));
  
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0x00FF00, components: components })
    .build();
  
  await modalSubmit.reply({ ...payload, ephemeral: true });
}

/**
 * Handle automod log setup
 */
async function handleAutoModLogSetup(interaction) {
  const modal = InteractionUtils.createModal(
    "automod_log_modal",
    "Set AutoMod Log Channel",
    [
      {
        customId: "channel_id",
        label: "Channel ID",
        style: TextInputStyle.Short,
        placeholder: "Enter channel ID for automod logs",
        required: true,
      },
    ]
  );
  
  await interaction.showModal(modal);
  
  const modalSubmit = await InteractionUtils.awaitModalSubmit(
    interaction,
    "automod_log_modal",
    120000
  );
  
  if (!modalSubmit) return;
  
  const channelId = modalSubmit.fields.getTextInputValue("channel_id");
  const channel = await interaction.guild.channels
    .fetch(channelId)
    .catch(() => null);
  
  if (!channel || channel.type !== ChannelType.GuildText) {
    return modalSubmit.reply({
      embeds: [InteractionUtils.createErrorEmbed("Invalid text channel ID!")],
      ephemeral: true,
    });
  }
  
  await GuildSettings.updateOne(
    { guildId: interaction.guild.id },
    {
      $set: {
        "automod.log_channel": channel.id,
      },
    },
    { upsert: true }
  );
  
  const components = [];
  components.push(ContainerBuilder.createTextDisplay("# ✅ AutoMod Log Configured"));
  components.push(ContainerBuilder.createSeparator());
  components.push(ContainerBuilder.createTextDisplay(
    `**Channel:** ${channel}\n\n` +
    `All automod violations will now be logged in this channel.`
  ));
  
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0x00FF00, components: components })
    .build();
  
  await modalSubmit.reply({ ...payload, ephemeral: true });
}

/**
 * Handle disable mod log
 */
async function handleDisableModLog(interaction) {
  await GuildSettings.updateOne(
    { guildId: interaction.guild.id },
    {
      $unset: {
        modlog_channel: "",
      },
    },
    { upsert: true }
  );
  
  const components = [];
  components.push(ContainerBuilder.createTextDisplay("# 🔴 Moderation Log Disabled"));
  components.push(ContainerBuilder.createSeparator());
  components.push(ContainerBuilder.createTextDisplay(
    "Moderation actions will no longer be logged."
  ));
  
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0xFF6B00, components: components })
    .build();
  
  await interaction.reply({ ...payload, ephemeral: true });
}

/**
 * Handle disable automod log
 */
async function handleDisableAutoModLog(interaction) {
  await GuildSettings.updateOne(
    { guildId: interaction.guild.id },
    {
      $unset: {
        "automod.log_channel": "",
      },
    },
    { upsert: true }
  );
  
  const components = [];
  components.push(ContainerBuilder.createTextDisplay("# 🔴 AutoMod Log Disabled"));
  components.push(ContainerBuilder.createSeparator());
  components.push(ContainerBuilder.createTextDisplay(
    "AutoMod violations will no longer be logged."
  ));
  
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0xFF6B00, components: components })
    .build();
  
  await interaction.reply({ ...payload, ephemeral: true });
}
