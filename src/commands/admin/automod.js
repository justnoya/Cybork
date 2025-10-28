const { ApplicationCommandOptionType, ChannelType, ComponentType, ButtonStyle } = require("discord.js");
const ContainerBuilder = require("@helpers/ContainerBuilder");
const InteractionUtils = require("@helpers/InteractionUtils");
const emojis = require("@root/emojis.json");
const { statusEmoji, getEmoji } = require("@helpers/EmojiUtils");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "automod",
  description: "Configure automatic moderation rules with interactive panel",
  category: "AUTOMOD",
  userPermissions: ["ManageGuild"],
  command: {
    enabled: true,
    aliases: ["am", "automods"],
  },
  slashCommand: {
    enabled: true,
    ephemeral: true,
  },

  async messageRun(message, args, data) {
    await showAutomodPanel(message, false, data.settings);
  },

  async interactionRun(interaction, data) {
    await interaction.deferReply({ ephemeral: true });
    await showAutomodPanel(interaction, true, data.settings);
  },
};

/**
 * Show main automod interactive panel
 */
async function showAutomodPanel(source, isInteraction, settings) {
  const automod = settings.automod || {};
  
  const components = [];
  
  components.push(ContainerBuilder.createTextDisplay("# 🤖 AutoMod Control Panel"));
  components.push(ContainerBuilder.createSeparator());
  
  components.push(ContainerBuilder.createTextDisplay(
    "## Protection Status\n" +
    `Configure automatic moderation rules to keep your server safe.`
  ));
  
  components.push(ContainerBuilder.createSeparator());
  
  const antiSpamStatus = automod.anti_spam?.enabled 
    ? `${statusEmoji(true)} **Active** (${automod.anti_spam.threshold} msgs/${automod.anti_spam.timeframe}s)`
    : `${statusEmoji(false)} Disabled`;
  components.push(ContainerBuilder.createTextDisplay(`**Anti-Spam:** ${antiSpamStatus}`));
  
  const antiLinkStatus = automod.anti_links 
    ? `${statusEmoji(true)} **Active**` 
    : `${statusEmoji(false)} Disabled`;
  components.push(ContainerBuilder.createTextDisplay(`**Anti-Link:** ${antiLinkStatus}`));
  
  const antiBadwordsStatus = automod.anti_badwords?.enabled
    ? `${statusEmoji(true)} **Active** (${automod.anti_badwords.keywords?.length || 0} keywords)`
    : `${statusEmoji(false)} Disabled`;
  components.push(ContainerBuilder.createTextDisplay(`**Bad Words Filter:** ${antiBadwordsStatus}`));
  
  const antiZalgoStatus = automod.anti_zalgo?.enabled
    ? `${statusEmoji(true)} **Active** (${automod.anti_zalgo.threshold}% threshold)`
    : `${statusEmoji(false)} Disabled`;
  components.push(ContainerBuilder.createTextDisplay(`**Anti-Zalgo:** ${antiZalgoStatus}`));
  
  const antiCapsStatus = automod.anti_caps?.enabled
    ? `${statusEmoji(true)} **Active** (${automod.anti_caps.threshold}% threshold)`
    : `${statusEmoji(false)} Disabled`;
  components.push(ContainerBuilder.createTextDisplay(`**Anti-Caps:** ${antiCapsStatus}`));
  
  const whitelistedCount = automod.wh_channels?.length || 0;
  components.push(ContainerBuilder.createTextDisplay(`**Whitelisted Channels:** ${whitelistedCount}`));
  
  const buttonRow1 = InteractionUtils.createButtonRow([
    {
      customId: "automod_antispam",
      label: "Anti-Spam",
      emoji: "🚫",
      style: ButtonStyle.Secondary,
    },
    {
      customId: "automod_antilink",
      label: "Anti-Link",
      emoji: "🔗",
      style: ButtonStyle.Secondary,
    },
    {
      customId: "automod_badwords",
      label: "Bad Words",
      emoji: "🤬",
      style: ButtonStyle.Secondary,
    },
  ]);
  
  const buttonRow2 = InteractionUtils.createButtonRow([
    {
      customId: "automod_zalgo",
      label: "Anti-Zalgo",
      emoji: "👾",
      style: ButtonStyle.Secondary,
    },
    {
      customId: "automod_caps",
      label: "Anti-Caps",
      emoji: "📢",
      style: ButtonStyle.Secondary,
    },
    {
      customId: "automod_whitelist",
      label: "Whitelist",
      emoji: "📋",
      style: ButtonStyle.Secondary,
    },
  ]);
  
  components.push(buttonRow1);
  components.push(buttonRow2);
  
  const payload = new ContainerBuilder()
    .addContainer({
      accentColor: 0xFFFFFF,
      components: components
    })
    .build();
  
  const msg = isInteraction
    ? await source.editReply(payload)
    : await source.safeReply(payload);
  
  setupCollector(msg, source, isInteraction, settings);
}

/**
 * Setup button collector
 */
function setupCollector(message, source, isInteraction, settings) {
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === (isInteraction ? source.user.id : source.author.id),
    time: 300000,
  });
  
  collector.on("collect", async (interaction) => {
    try {
      switch (interaction.customId) {
        case "automod_antispam":
          await handleAntiSpam(interaction, settings);
          await showAutomodPanel(source, isInteraction, settings);
          break;
        case "automod_antilink":
          await handleAntiLink(interaction, settings);
          await showAutomodPanel(source, isInteraction, settings);
          break;
        case "automod_badwords":
          await handleBadWords(interaction, settings);
          await showAutomodPanel(source, isInteraction, settings);
          break;
        case "automod_zalgo":
          await handleAntiZalgo(interaction, settings);
          await showAutomodPanel(source, isInteraction, settings);
          break;
        case "automod_caps":
          await handleAntiCaps(interaction, settings);
          await showAutomodPanel(source, isInteraction, settings);
          break;
        case "automod_whitelist":
          await handleWhitelist(interaction, settings);
          await showAutomodPanel(source, isInteraction, settings);
          break;
      }
    } catch (error) {
      console.error("Automod panel error:", error);
      await interaction.reply({
        content: `${getEmoji("error")} An error occurred: ${error.message}`,
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
 * Handle Anti-Spam configuration
 */
async function handleAntiSpam(interaction, settings) {
  const currentEnabled = settings.automod?.anti_spam?.enabled || false;
  const currentThreshold = settings.automod?.anti_spam?.threshold || 5;
  const currentTimeframe = settings.automod?.anti_spam?.timeframe || 5;
  
  const components = [];
  components.push(ContainerBuilder.createTextDisplay("## 🚫 Anti-Spam Protection"));
  components.push(ContainerBuilder.createSeparator());
  components.push(ContainerBuilder.createTextDisplay(
    `**Current Status:** ${statusEmoji(currentEnabled)} ${currentEnabled ? 'Enabled' : 'Disabled'}\n` +
    `**Threshold:** ${currentThreshold} messages\n` +
    `**Timeframe:** ${currentTimeframe} seconds`
  ));
  
  const toggleButton = InteractionUtils.createButtonRow([
    {
      customId: `spam_toggle_${!currentEnabled}`,
      label: currentEnabled ? "Disable" : "Enable",
      emoji: currentEnabled ? "🔴" : "🟢",
      style: ButtonStyle.Secondary,
    },
    {
      customId: "spam_config",
      label: "Configure",
      emoji: "⚙️",
      style: ButtonStyle.Secondary,
      disabled: !currentEnabled,
    },
  ]);
  
  components.push(toggleButton);
  
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0xFFFFFF, components: components })
    .build();
  
  await interaction.reply({ ...payload, ephemeral: true });
  
  const response = await InteractionUtils.awaitComponent(
    await interaction.fetchReply(),
    interaction.user.id,
    { componentType: ComponentType.Button },
    60000
  );
  
  if (!response) {
    return interaction.editReply({
      content: "⏱️ Configuration timed out",
      components: []
    });
  }
  
  if (response.customId.startsWith("spam_toggle_")) {
    const newEnabled = response.customId === "spam_toggle_true";
    if (!settings.automod) settings.automod = {};
    settings.automod.anti_spam = { 
      enabled: newEnabled, 
      threshold: currentThreshold, 
      timeframe: currentTimeframe 
    };
    await settings.save();
    
    await response.update({
      embeds: [InteractionUtils.createSuccessEmbed(
        `${getEmoji("success")} Anti-Spam ${newEnabled ? 'enabled' : 'disabled'}`
      )],
      components: []
    });
  } else if (response.customId === "spam_config") {
    const modal = InteractionUtils.createModal("spam_config_modal", "Configure Anti-Spam", [
      {
        customId: "threshold",
        label: "Message Threshold (3-10)",
        style: 1,
        placeholder: "Messages before action",
        required: true,
        value: currentThreshold.toString(),
      },
      {
        customId: "timeframe",
        label: "Timeframe in Seconds (3-30)",
        style: 1,
        placeholder: "Seconds to check",
        required: true,
        value: currentTimeframe.toString(),
      },
    ]);
    
    await response.showModal(modal);
    
    const modalSubmit = await InteractionUtils.awaitModalSubmit(response, "spam_config_modal", 120000);
    if (!modalSubmit) return;
    
    const threshold = parseInt(modalSubmit.fields.getTextInputValue("threshold")) || 5;
    const timeframe = parseInt(modalSubmit.fields.getTextInputValue("timeframe")) || 5;
    
    if (!settings.automod) settings.automod = {};
    settings.automod.anti_spam = { enabled: true, threshold, timeframe };
    await settings.save();
    
    await modalSubmit.reply({
      embeds: [InteractionUtils.createSuccessEmbed(
        `${getEmoji("success")} Anti-Spam configured: ${threshold} messages per ${timeframe} seconds`
      )],
      ephemeral: true
    });
  }
}

/**
 * Handle Anti-Link configuration
 */
async function handleAntiLink(interaction, settings) {
  const currentEnabled = settings.automod?.anti_links || false;
  
  if (!settings.automod) settings.automod = {};
  settings.automod.anti_links = !currentEnabled;
  await settings.save();
  
  await interaction.reply({
    embeds: [InteractionUtils.createSuccessEmbed(
      `${getEmoji("success")} Anti-Link ${!currentEnabled ? 'enabled' : 'disabled'}`
    )],
    ephemeral: true
  });
}

/**
 * Handle Bad Words configuration
 */
async function handleBadWords(interaction, settings) {
  const currentEnabled = settings.automod?.anti_badwords?.enabled || false;
  
  if (!settings.automod) settings.automod = {};
  if (!settings.automod.anti_badwords) {
    settings.automod.anti_badwords = { keywords: [], action: "DELETE" };
  }
  settings.automod.anti_badwords.enabled = !currentEnabled;
  await settings.save();
  
  await interaction.reply({
    embeds: [InteractionUtils.createSuccessEmbed(
      `${getEmoji("success")} Bad Words Filter ${!currentEnabled ? 'enabled' : 'disabled'}\n\n` +
      `${!currentEnabled ? 'Use the dashboard or database to manage keyword list' : ''}`
    )],
    ephemeral: true
  });
}

/**
 * Handle Anti-Zalgo configuration
 */
async function handleAntiZalgo(interaction, settings) {
  const currentEnabled = settings.automod?.anti_zalgo?.enabled || false;
  const currentThreshold = settings.automod?.anti_zalgo?.threshold || 50;
  
  const components = [];
  components.push(ContainerBuilder.createTextDisplay("## 👾 Anti-Zalgo Protection"));
  components.push(ContainerBuilder.createSeparator());
  components.push(ContainerBuilder.createTextDisplay(
    `**Current Status:** ${statusEmoji(currentEnabled)} ${currentEnabled ? 'Enabled' : 'Disabled'}\n` +
    `**Detection Threshold:** ${currentThreshold}%`
  ));
  
  const toggleButton = InteractionUtils.createButtonRow([
    {
      customId: `zalgo_toggle_${!currentEnabled}`,
      label: currentEnabled ? "Disable" : "Enable",
      emoji: currentEnabled ? "🔴" : "🟢",
      style: ButtonStyle.Secondary,
    },
    {
      customId: "zalgo_config",
      label: "Configure",
      emoji: "⚙️",
      style: ButtonStyle.Secondary,
      disabled: !currentEnabled,
    },
  ]);
  
  components.push(toggleButton);
  
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0xFFFFFF, components: components })
    .build();
  
  await interaction.reply({ ...payload, ephemeral: true });
  
  const response = await InteractionUtils.awaitComponent(
    await interaction.fetchReply(),
    interaction.user.id,
    { componentType: ComponentType.Button },
    60000
  );
  
  if (!response) {
    return interaction.editReply({
      content: "⏱️ Configuration timed out",
      components: []
    });
  }
  
  if (response.customId.startsWith("zalgo_toggle_")) {
    const newEnabled = response.customId === "zalgo_toggle_true";
    if (!settings.automod) settings.automod = {};
    settings.automod.anti_zalgo = { enabled: newEnabled, threshold: currentThreshold };
    await settings.save();
    
    await response.update({
      embeds: [InteractionUtils.createSuccessEmbed(
        `${getEmoji("success")} Anti-Zalgo ${newEnabled ? 'enabled' : 'disabled'}`
      )],
      components: []
    });
  } else if (response.customId === "zalgo_config") {
    const modal = InteractionUtils.createModal("zalgo_config_modal", "Configure Anti-Zalgo", [
      {
        customId: "threshold",
        label: "Detection Threshold % (30-90)",
        style: 1,
        placeholder: "Detection threshold percentage",
        required: true,
        value: currentThreshold.toString(),
      },
    ]);
    
    await response.showModal(modal);
    
    const modalSubmit = await InteractionUtils.awaitModalSubmit(response, "zalgo_config_modal", 120000);
    if (!modalSubmit) return;
    
    const threshold = parseInt(modalSubmit.fields.getTextInputValue("threshold")) || 50;
    
    if (!settings.automod) settings.automod = {};
    settings.automod.anti_zalgo = { enabled: true, threshold };
    await settings.save();
    
    await modalSubmit.reply({
      embeds: [InteractionUtils.createSuccessEmbed(
        `${getEmoji("success")} Anti-Zalgo configured with ${threshold}% threshold`
      )],
      ephemeral: true
    });
  }
}

/**
 * Handle Anti-Caps configuration
 */
async function handleAntiCaps(interaction, settings) {
  const currentEnabled = settings.automod?.anti_caps?.enabled || false;
  const currentThreshold = settings.automod?.anti_caps?.threshold || 70;
  
  const components = [];
  components.push(ContainerBuilder.createTextDisplay("## 📢 Anti-Caps Protection"));
  components.push(ContainerBuilder.createSeparator());
  components.push(ContainerBuilder.createTextDisplay(
    `**Current Status:** ${statusEmoji(currentEnabled)} ${currentEnabled ? 'Enabled' : 'Disabled'}\n` +
    `**Caps Threshold:** ${currentThreshold}%`
  ));
  
  const toggleButton = InteractionUtils.createButtonRow([
    {
      customId: `caps_toggle_${!currentEnabled}`,
      label: currentEnabled ? "Disable" : "Enable",
      emoji: currentEnabled ? "🔴" : "🟢",
      style: ButtonStyle.Secondary,
    },
    {
      customId: "caps_config",
      label: "Configure",
      emoji: "⚙️",
      style: ButtonStyle.Secondary,
      disabled: !currentEnabled,
    },
  ]);
  
  components.push(toggleButton);
  
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0xFFFFFF, components: components })
    .build();
  
  await interaction.reply({ ...payload, ephemeral: true });
  
  const response = await InteractionUtils.awaitComponent(
    await interaction.fetchReply(),
    interaction.user.id,
    { componentType: ComponentType.Button },
    60000
  );
  
  if (!response) {
    return interaction.editReply({
      content: "⏱️ Configuration timed out",
      components: []
    });
  }
  
  if (response.customId.startsWith("caps_toggle_")) {
    const newEnabled = response.customId === "caps_toggle_true";
    if (!settings.automod) settings.automod = {};
    settings.automod.anti_caps = { enabled: newEnabled, threshold: currentThreshold, min_length: 10 };
    await settings.save();
    
    await response.update({
      embeds: [InteractionUtils.createSuccessEmbed(
        `${getEmoji("success")} Anti-Caps ${newEnabled ? 'enabled' : 'disabled'}`
      )],
      components: []
    });
  } else if (response.customId === "caps_config") {
    const modal = InteractionUtils.createModal("caps_config_modal", "Configure Anti-Caps", [
      {
        customId: "threshold",
        label: "Caps Threshold % (50-95)",
        style: 1,
        placeholder: "Caps threshold percentage",
        required: true,
        value: currentThreshold.toString(),
      },
    ]);
    
    await response.showModal(modal);
    
    const modalSubmit = await InteractionUtils.awaitModalSubmit(response, "caps_config_modal", 120000);
    if (!modalSubmit) return;
    
    const threshold = parseInt(modalSubmit.fields.getTextInputValue("threshold")) || 70;
    
    if (!settings.automod) settings.automod = {};
    settings.automod.anti_caps = { enabled: true, threshold, min_length: 10 };
    await settings.save();
    
    await modalSubmit.reply({
      embeds: [InteractionUtils.createSuccessEmbed(
        `${getEmoji("success")} Anti-Caps configured with ${threshold}% threshold`
      )],
      ephemeral: true
    });
  }
}

/**
 * Handle Whitelist management
 */
async function handleWhitelist(interaction, settings) {
  const whitelistChannels = settings.automod?.wh_channels || [];
  
  const components = [];
  components.push(ContainerBuilder.createTextDisplay("## 📋 Whitelist Management"));
  components.push(ContainerBuilder.createSeparator());
  
  if (whitelistChannels.length === 0) {
    components.push(ContainerBuilder.createTextDisplay(
      "**No channels whitelisted**\n\nWhitelisted channels are exempt from automod rules."
    ));
  } else {
    const channelList = whitelistChannels.map(id => `<#${id}>`).join("\n");
    components.push(ContainerBuilder.createTextDisplay(
      `**Whitelisted Channels (${whitelistChannels.length}):**\n${channelList}`
    ));
  }
  
  const buttonRow = InteractionUtils.createButtonRow([
    {
      customId: "whitelist_add",
      label: "Add Channel",
      emoji: "➕",
      style: ButtonStyle.Secondary,
    },
    {
      customId: "whitelist_remove",
      label: "Remove Channel",
      emoji: "➖",
      style: ButtonStyle.Secondary,
      disabled: whitelistChannels.length === 0,
    },
  ]);
  
  components.push(buttonRow);
  
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0xFFFFFF, components: components })
    .build();
  
  await interaction.reply({ ...payload, ephemeral: true });
  
  const response = await InteractionUtils.awaitComponent(
    await interaction.fetchReply(),
    interaction.user.id,
    { componentType: ComponentType.Button },
    60000
  );
  
  if (!response) {
    return interaction.editReply({
      content: "⏱️ Configuration timed out",
      components: []
    });
  }
  
  if (response.customId === "whitelist_add") {
    const modal = InteractionUtils.createModal("whitelist_add_modal", "Add Whitelisted Channel", [
      {
        customId: "channel_id",
        label: "Channel ID",
        style: 1,
        placeholder: "Enter channel ID to whitelist",
        required: true,
      },
    ]);
    
    await response.showModal(modal);
    
    const modalSubmit = await InteractionUtils.awaitModalSubmit(response, "whitelist_add_modal", 120000);
    if (!modalSubmit) return;
    
    const channelId = modalSubmit.fields.getTextInputValue("channel_id");
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    
    if (!channel) {
      return modalSubmit.reply({
        embeds: [InteractionUtils.createErrorEmbed("Invalid channel ID!")],
        ephemeral: true
      });
    }
    
    if (!settings.automod) settings.automod = {};
    if (!settings.automod.wh_channels) settings.automod.wh_channels = [];
    
    if (settings.automod.wh_channels.includes(channel.id)) {
      return modalSubmit.reply({
        embeds: [InteractionUtils.createErrorEmbed(`${channel} is already whitelisted`)],
        ephemeral: true
      });
    }
    
    settings.automod.wh_channels.push(channel.id);
    await settings.save();
    
    await modalSubmit.reply({
      embeds: [InteractionUtils.createSuccessEmbed(
        `${getEmoji("success")} Channel Whitelisted\n\n${channel} is now exempt from automod`
      )],
      ephemeral: true
    });
  } else if (response.customId === "whitelist_remove") {
    const modal = InteractionUtils.createModal("whitelist_remove_modal", "Remove Whitelisted Channel", [
      {
        customId: "channel_id",
        label: "Channel ID",
        style: 1,
        placeholder: "Enter channel ID to remove",
        required: true,
      },
    ]);
    
    await response.showModal(modal);
    
    const modalSubmit = await InteractionUtils.awaitModalSubmit(response, "whitelist_remove_modal", 120000);
    if (!modalSubmit) return;
    
    const channelId = modalSubmit.fields.getTextInputValue("channel_id");
    
    if (!settings.automod?.wh_channels?.includes(channelId)) {
      return modalSubmit.reply({
        embeds: [InteractionUtils.createErrorEmbed("Channel is not whitelisted")],
        ephemeral: true
      });
    }
    
    settings.automod.wh_channels = settings.automod.wh_channels.filter(id => id !== channelId);
    await settings.save();
    
    await modalSubmit.reply({
      embeds: [InteractionUtils.createSuccessEmbed(
        `${getEmoji("success")} Channel Removed\n\n<#${channelId}> is no longer whitelisted`
      )],
      ephemeral: true
    });
  }
}
