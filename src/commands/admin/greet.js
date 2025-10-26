const { ApplicationCommandOptionType, ChannelType, ComponentType, ButtonStyle, TextInputStyle } = require("discord.js");
const ContainerBuilder = require("@helpers/ContainerBuilder");
const InteractionUtils = require("@helpers/InteractionUtils");
const { buildGreeting } = require("@handlers/greeting");
const emojis = require("@root/emojis.json");
const { getEmoji, statusEmoji } = require("@helpers/EmojiUtils");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "greet",
  description: "Configure welcome greeting system with interactive panel",
  category: "GATEWAY",
  userPermissions: ["ManageGuild"],
  command: {
    enabled: true,
    aliases: ["welcome", "greeting"],
  },
  slashCommand: {
    enabled: true,
    ephemeral: true,
  },

  async messageRun(message, args, data) {
    await showGreetingPanel(message, false, data.settings);
  },

  async interactionRun(interaction, data) {
    await interaction.deferReply({ ephemeral: true });
    await showGreetingPanel(interaction, true, data.settings);
  },
};

/**
 * Show main greeting panel
 */
async function showGreetingPanel(source, isInteraction, settings) {
  const welcome = settings.welcome || {};
  
  const components = [];
  
  components.push(ContainerBuilder.createTextDisplay("# 👋 Welcome Greeting System"));
  components.push(ContainerBuilder.createSeparator());
  
  components.push(ContainerBuilder.createTextDisplay(
    "## Configuration Status\n" +
    "Set up automatic welcome messages for new members joining your server."
  ));
  
  components.push(ContainerBuilder.createSeparator());
  
  // Status
  const isEnabled = welcome.enabled && welcome.channels?.length > 0;
  const status = isEnabled ? `${statusEmoji(true)} **Active**` : `${statusEmoji(false)} Disabled`;
  components.push(ContainerBuilder.createTextDisplay(`**System Status:** ${status}`));
  
  // Channels
  const channelCount = welcome.channels?.length || 0;
  const channelText = channelCount > 0 
    ? welcome.channels.map(id => `<#${id}>`).join(", ")
    : "No channels configured";
  components.push(ContainerBuilder.createTextDisplay(`**Greeting Channels (${channelCount}):** ${channelText}`));
  
  components.push(ContainerBuilder.createSeparator());
  
  // Settings
  const embedMode = welcome.embed?.enabled 
    ? `${statusEmoji(true)} **Enabled**` 
    : `${statusEmoji(false)} Plain Text`;
  components.push(ContainerBuilder.createTextDisplay(`**Embed Mode:** ${embedMode}`));
  
  const autoDelete = welcome.auto_delete?.enabled
    ? `${statusEmoji(true)} **${welcome.auto_delete.delay}s delay**`
    : `${statusEmoji(false)} Disabled`;
  components.push(ContainerBuilder.createTextDisplay(`**Auto-Delete:** ${autoDelete}`));
  
  const message = welcome.content || welcome.embed?.description || "Not set";
  const messagePreview = message.length > 100 ? message.substring(0, 100) + "..." : message;
  components.push(ContainerBuilder.createTextDisplay(`**Message:** \`${messagePreview}\``));
  
  const buttonRow1 = InteractionUtils.createButtonRow([
    {
      customId: "greet_channels",
      label: "Manage Channels",
      emoji: "📺",
      style: ButtonStyle.Secondary,
    },
    {
      customId: "greet_message",
      label: "Set Message",
      emoji: "✏️",
      style: ButtonStyle.Secondary,
    },
    {
      customId: "greet_embed",
      label: "Embed Settings",
      emoji: "📋",
      style: ButtonStyle.Secondary,
    },
  ]);
  
  const buttonRow2 = InteractionUtils.createButtonRow([
    {
      customId: "greet_autodel",
      label: "Auto-Delete",
      emoji: "🗑️",
      style: ButtonStyle.Secondary,
    },
    {
      customId: "greet_test",
      label: "Test Greeting",
      emoji: "🧪",
      style: ButtonStyle.Secondary,
      disabled: !isEnabled,
    },
    {
      customId: "greet_variables",
      label: "Variables",
      emoji: "📝",
      style: ButtonStyle.Secondary,
    },
  ]);
  
  const payload = new ContainerBuilder()
    .addContainer({
      accentColor: 0xFFFFFF,
      components: components
    })
    .build();
  
  payload.components.push(buttonRow1, buttonRow2);
  
  const msg = isInteraction
    ? await source.editReply(payload)
    : await source.safeReply(payload);
  
  setupCollector(msg, source, isInteraction, settings);
}

/**
 * Setup collector
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
        case "greet_channels":
          await handleChannels(interaction, source, isInteraction, settings);
          break;
        case "greet_message":
          await handleMessage(interaction, settings);
          await showGreetingPanel(source, isInteraction, settings);
          break;
        case "greet_embed":
          await handleEmbedSettings(interaction, settings);
          await showGreetingPanel(source, isInteraction, settings);
          break;
        case "greet_autodel":
          await handleAutoDelete(interaction, settings);
          await showGreetingPanel(source, isInteraction, settings);
          break;
        case "greet_test":
          await handleTest(interaction, source, settings);
          break;
        case "greet_variables":
          await handleVariables(interaction);
          break;
      }
    } catch (error) {
      console.error("Greet panel error:", error);
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
 * Handle channel management
 */
async function handleChannels(interaction, source, isInteraction, settings) {
  const welcome = settings.welcome || {};
  const channels = welcome.channels || [];
  
  const components = [];
  components.push(ContainerBuilder.createTextDisplay("## 📺 Greeting Channels"));
  components.push(ContainerBuilder.createSeparator());
  
  if (channels.length === 0) {
    components.push(ContainerBuilder.createTextDisplay("**No channels configured**\n\nAdd channels to send welcome greetings."));
  } else {
    const channelList = channels.map(id => `<#${id}>`).join("\n");
    components.push(ContainerBuilder.createTextDisplay(`**Active Channels (${channels.length}):**\n${channelList}`));
  }
  
  const buttonRow = InteractionUtils.createButtonRow([
    {
      customId: "greet_channel_add",
      label: "Add Channel",
      emoji: "➕",
      style: ButtonStyle.Secondary,
    },
    {
      customId: "greet_channel_remove",
      label: "Remove Channel",
      emoji: "➖",
      style: ButtonStyle.Secondary,
      disabled: channels.length === 0,
    },
  ]);
  
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0xFFFFFF, components: components })
    .build();
  
  payload.components.push(buttonRow);
  
  await interaction.reply({ ...payload, ephemeral: true });
  
  const response = await InteractionUtils.awaitComponent(
    await interaction.fetchReply(),
    interaction.user.id,
    { componentType: ComponentType.Button },
    60000
  );
  
  if (!response) {
    return interaction.editReply({ content: "⏱️ Channel selection timed out", components: [] });
  }
  
  if (response.customId === "greet_channel_add") {
    const modal = InteractionUtils.createModal("greet_add_channel", "Add Greeting Channel", [
      {
        customId: "channel_id",
        label: "Channel ID",
        style: TextInputStyle.Short,
        placeholder: "Enter channel ID",
        required: true,
      },
    ]);
    
    await response.showModal(modal);
    
    const modalSubmit = await InteractionUtils.awaitModalSubmit(response, "greet_add_channel", 120000);
    if (!modalSubmit) return;
    
    const channelId = modalSubmit.fields.getTextInputValue("channel_id");
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    
    if (!channel || channel.type !== ChannelType.GuildText) {
      return modalSubmit.reply({
        embeds: [InteractionUtils.createErrorEmbed("Invalid text channel ID!")],
        ephemeral: true
      });
    }
    
    if (!channel.permissionsFor(interaction.guild.members.me).has(["SendMessages", "EmbedLinks"])) {
      return modalSubmit.reply({
        embeds: [InteractionUtils.createErrorEmbed(`I need SendMessages and EmbedLinks permissions in ${channel}!`)],
        ephemeral: true
      });
    }
    
    if (!settings.welcome) settings.welcome = { enabled: true };
    if (!settings.welcome.channels) settings.welcome.channels = [];
    
    if (settings.welcome.channels.includes(channel.id)) {
      return modalSubmit.reply({
        embeds: [InteractionUtils.createErrorEmbed(`${channel} is already a greeting channel`)],
        ephemeral: true
      });
    }
    
    settings.welcome.channels.push(channel.id);
    settings.welcome.enabled = true;
    await settings.save();
    
    await modalSubmit.reply({
      embeds: [InteractionUtils.createSuccessEmbed(
        `${getEmoji("success")} Greeting Channel Added\n\n${channel} will now receive welcome messages`
      )],
      ephemeral: true
    });
    
    await showGreetingPanel(source, isInteraction, settings);
  } else if (response.customId === "greet_channel_remove") {
    const modal = InteractionUtils.createModal("greet_remove_channel", "Remove Greeting Channel", [
      {
        customId: "channel_id",
        label: "Channel ID",
        style: TextInputStyle.Short,
        placeholder: "Enter channel ID to remove",
        required: true,
      },
    ]);
    
    await response.showModal(modal);
    
    const modalSubmit = await InteractionUtils.awaitModalSubmit(response, "greet_remove_channel", 120000);
    if (!modalSubmit) return;
    
    const channelId = modalSubmit.fields.getTextInputValue("channel_id");
    
    if (!settings.welcome?.channels?.includes(channelId)) {
      return modalSubmit.reply({
        embeds: [InteractionUtils.createErrorEmbed("Channel is not in the greeting list")],
        ephemeral: true
      });
    }
    
    settings.welcome.channels = settings.welcome.channels.filter(id => id !== channelId);
    await settings.save();
    
    await modalSubmit.reply({
      embeds: [InteractionUtils.createSuccessEmbed(
        `${getEmoji("success")} Channel Removed\n\n<#${channelId}> will no longer receive greetings`
      )],
      ephemeral: true
    });
    
    await showGreetingPanel(source, isInteraction, settings);
  }
}

/**
 * Handle message setting
 */
async function handleMessage(interaction, settings) {
  const currentMessage = settings.welcome?.content || settings.welcome?.embed?.description || "Welcome to {server}, {user}!";
  
  const modal = InteractionUtils.createModal("greet_message_modal", "Set Greeting Message", [
    {
      customId: "message",
      label: "Greeting Message",
      style: TextInputStyle.Paragraph,
      placeholder: "Welcome to {server}, {user}!\nUse {variables} for dynamic content",
      required: true,
      value: currentMessage,
      maxLength: 1000,
    },
  ]);
  
  await interaction.showModal(modal);
  
  const modalSubmit = await InteractionUtils.awaitModalSubmit(interaction, "greet_message_modal", 120000);
  if (!modalSubmit) return;
  
  const message = modalSubmit.fields.getTextInputValue("message");
  
  if (!settings.welcome) settings.welcome = {};
  
  if (settings.welcome.embed?.enabled) {
    if (!settings.welcome.embed) settings.welcome.embed = {};
    settings.welcome.embed.description = message;
  } else {
    settings.welcome.content = message;
  }
  
  await settings.save();
  
  await modalSubmit.reply({
    embeds: [InteractionUtils.createSuccessEmbed(
      `${emojis.success} Message Updated\n\nPreview: ${message.substring(0, 150)}${message.length > 150 ? '...' : ''}`
    )],
    ephemeral: true
  });
}

/**
 * Handle embed settings
 */
async function handleEmbedSettings(interaction, settings) {
  const currentEnabled = settings.welcome?.embed?.enabled || false;
  
  const components = [];
  components.push(ContainerBuilder.createTextDisplay("## 📋 Embed Mode Settings"));
  components.push(ContainerBuilder.createSeparator());
  components.push(ContainerBuilder.createTextDisplay(
    `**Current Mode:** ${statusEmoji(currentEnabled)} ${currentEnabled ? 'Embed' : 'Plain Text'}\n\n` +
    `Embed mode shows greetings in a styled embed format instead of plain text.`
  ));
  
  const toggleButton = InteractionUtils.createButtonRow([
    {
      customId: `embed_toggle_${!currentEnabled}`,
      label: currentEnabled ? "Disable Embed" : "Enable Embed",
      emoji: currentEnabled ? "📄" : "📋",
      style: ButtonStyle.Secondary,
    },
  ]);
  
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0xFFFFFF, components: components })
    .build();
  
  payload.components.push(toggleButton);
  
  await interaction.reply({ ...payload, ephemeral: true });
  
  const response = await InteractionUtils.awaitComponent(
    await interaction.fetchReply(),
    interaction.user.id,
    { componentType: ComponentType.Button },
    60000
  );
  
  if (!response) {
    return interaction.editReply({ content: "⏱️ Configuration timed out", components: [] });
  }
  
  const newEnabled = response.customId === "embed_toggle_true";
  
  if (!settings.welcome) settings.welcome = {};
  if (!settings.welcome.embed) {
    settings.welcome.embed = {
      enabled: newEnabled,
      description: "Welcome to {server}, {user}!",
      color: "#FFFFFF",
      thumbnail: true,
      footer: "Member #{memberCount}",
    };
  } else {
    settings.welcome.embed.enabled = newEnabled;
  }
  
  await settings.save();
  
  await response.update({
    embeds: [InteractionUtils.createSuccessEmbed(
      `${getEmoji("success")} Embed Mode ${newEnabled ? 'Enabled' : 'Disabled'}\n\nGreetings will now use ${newEnabled ? 'embed' : 'plain text'} format`
    )],
    components: []
  });
}

/**
 * Handle auto-delete
 */
async function handleAutoDelete(interaction, settings) {
  const currentEnabled = settings.welcome?.auto_delete?.enabled || false;
  const currentDelay = settings.welcome?.auto_delete?.delay || 10;
  
  const components = [];
  components.push(ContainerBuilder.createTextDisplay("## 🗑️ Auto-Delete Settings"));
  components.push(ContainerBuilder.createSeparator());
  components.push(ContainerBuilder.createTextDisplay(
    `**Status:** ${statusEmoji(currentEnabled)} ${currentEnabled ? 'Enabled' : 'Disabled'}\n` +
    `**Delay:** ${currentDelay} seconds\n\n` +
    `Auto-delete removes greeting messages after a delay to keep channels clean.`
  ));
  
  const toggleButton = InteractionUtils.createButtonRow([
    {
      customId: `autodel_toggle_${!currentEnabled}`,
      label: currentEnabled ? "Disable" : "Enable",
      emoji: currentEnabled ? "🔴" : "🟢",
      style: ButtonStyle.Secondary,
    },
    {
      customId: "autodel_config",
      label: "Set Delay",
      emoji: "⏱️",
      style: ButtonStyle.Secondary,
      disabled: !currentEnabled,
    },
  ]);
  
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0xFFFFFF, components: components })
    .build();
  
  payload.components.push(toggleButton);
  
  await interaction.reply({ ...payload, ephemeral: true });
  
  const response = await InteractionUtils.awaitComponent(
    await interaction.fetchReply(),
    interaction.user.id,
    { componentType: ComponentType.Button },
    60000
  );
  
  if (!response) {
    return interaction.editReply({ content: "⏱️ Configuration timed out", components: [] });
  }
  
  if (response.customId.startsWith("autodel_toggle_")) {
    const newEnabled = response.customId === "autodel_toggle_true";
    
    if (!settings.welcome) settings.welcome = {};
    settings.welcome.auto_delete = { enabled: newEnabled, delay: currentDelay };
    await settings.save();
    
    await response.update({
      embeds: [InteractionUtils.createSuccessEmbed(
        `${getEmoji("success")} Auto-Delete ${newEnabled ? 'Enabled' : 'Disabled'}`
      )],
      components: []
    });
  } else if (response.customId === "autodel_config") {
    const modal = InteractionUtils.createModal("autodel_delay_modal", "Set Auto-Delete Delay", [
      {
        customId: "delay",
        label: "Delay in Seconds (5-300)",
        style: TextInputStyle.Short,
        placeholder: "e.g., 10",
        required: true,
        value: currentDelay.toString(),
      },
    ]);
    
    await response.showModal(modal);
    
    const modalSubmit = await InteractionUtils.awaitModalSubmit(response, "autodel_delay_modal", 120000);
    if (!modalSubmit) return;
    
    const delay = parseInt(modalSubmit.fields.getTextInputValue("delay")) || 10;
    const clampedDelay = Math.max(5, Math.min(300, delay));
    
    if (!settings.welcome) settings.welcome = {};
    settings.welcome.auto_delete = { enabled: true, delay: clampedDelay };
    await settings.save();
    
    await modalSubmit.reply({
      embeds: [InteractionUtils.createSuccessEmbed(
        `${getEmoji("success")} Auto-Delete Configured\n\nGreetings will be deleted after ${clampedDelay} seconds`
      )],
      ephemeral: true
    });
  }
}

/**
 * Handle test greeting
 */
async function handleTest(interaction, source, settings) {
  await interaction.deferReply({ ephemeral: true });
  
  if (!settings.welcome?.channels?.length) {
    return interaction.followUp({
      embeds: [InteractionUtils.createErrorEmbed("Please configure at least one greeting channel first")],
      ephemeral: true
    });
  }
  
  const channel = interaction.guild.channels.cache.get(settings.welcome.channels[0]);
  if (!channel) {
    return interaction.followUp({
      embeds: [InteractionUtils.createErrorEmbed("Configured channel not found")],
      ephemeral: true
    });
  }
  
  try {
    const member = interaction.guild.members.cache.get(interaction.user.id);
    const greeting = await buildGreeting(member, "WELCOME", settings.welcome);
    await channel.send(greeting);
    
    await interaction.followUp({
      embeds: [InteractionUtils.createSuccessEmbed(`${getEmoji("success")} Test greeting sent to ${channel}`)],
      ephemeral: true
    });
  } catch (error) {
    await interaction.followUp({
      embeds: [InteractionUtils.createErrorEmbed(`Failed to send test: ${error.message}`)],
      ephemeral: true
    });
  }
}

/**
 * Show variables
 */
async function handleVariables(interaction) {
  const components = [];
  components.push(ContainerBuilder.createTextDisplay("## 📝 Available Variables"));
  components.push(ContainerBuilder.createSeparator());
  components.push(ContainerBuilder.createTextDisplay(
    "**User Variables:**\n" +
    "`{user}` - User mention\n" +
    "`{username}` - Username\n" +
    "`{tag}` - User#1234\n" +
    "`{id}` - User ID"
  ));
  components.push(ContainerBuilder.createSeparator());
  components.push(ContainerBuilder.createTextDisplay(
    "**Server Variables:**\n" +
    "`{server}` - Server name\n" +
    "`{memberCount}` - Total members\n" +
    "`{members}` - Same as memberCount"
  ));
  components.push(ContainerBuilder.createSeparator());
  components.push(ContainerBuilder.createTextDisplay(
    "**Example:**\n" +
    "`Welcome {user} to {server}! You are member #{memberCount}`"
  ));
  
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0xFFFFFF, components: components })
    .build();
  
  await interaction.reply({ ...payload, ephemeral: true });
}
