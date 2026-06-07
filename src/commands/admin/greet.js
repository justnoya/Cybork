const { ApplicationCommandOptionType, ChannelType, ComponentType, ButtonStyle, TextInputStyle, ChannelSelectMenuBuilder, ActionRowBuilder, PermissionFlagsBits } = require("discord.js");
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
    const panelMsg = await message.safeReply("Loading...");
    await showGreetingPanel(message, panelMsg, false, data.settings, true);
  },

  async interactionRun(interaction, data) {
    await interaction.deferReply({ ephemeral: true });
    const panelMsg = await interaction.fetchReply();
    await showGreetingPanel(interaction, panelMsg, true, data.settings, true);
  },
};

/**
 * Helper to update panel message for both interaction and message flows
 */
async function updatePanel(panelMsg, isInteraction, payload) {
  if (isInteraction) {
    await panelMsg.edit(payload);
  } else {
    await panelMsg.edit(payload);
  }
}

/**
 * Show main greeting panel
 */
async function showGreetingPanel(source, panelMsg, isInteraction, settings, isInitial = false) {
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
  
  components.push(buttonRow1);
  components.push(buttonRow2);
  
  const payload = new ContainerBuilder()
    .addContainer({
      accentColor: 0xFFFFFF,
      components: components
    })
    .build();
  
  await updatePanel(panelMsg, isInteraction, payload);
  
  if (isInitial) {
    setupCollector(source, panelMsg, isInteraction, settings);
  }
}

/**
 * Setup collector
 */
function setupCollector(source, panelMsg, isInteraction, settings) {
  const collector = panelMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === (isInteraction ? source.user.id : source.author.id),
    time: 300000,
  });
  
  collector.on("collect", async (interaction) => {
    try {
      switch (interaction.customId) {
        case "greet_channels":
          await interaction.deferUpdate();
          await showChannelManager(source, panelMsg, isInteraction, settings);
          break;
        case "greet_message":
          await handleMessage(interaction, source, panelMsg, isInteraction, settings);
          break;
        case "greet_embed":
          await interaction.deferUpdate();
          await showEmbedSettings(source, panelMsg, isInteraction, settings);
          break;
        case "greet_autodel":
          await interaction.deferUpdate();
          await showAutoDeleteSettings(source, panelMsg, isInteraction, settings);
          break;
        case "greet_test":
          await handleTest(interaction, source, settings);
          break;
        case "greet_variables":
          await interaction.deferUpdate();
          await showVariables(source, panelMsg, isInteraction, settings);
          break;
      }
    } catch (error) {
      console.error("Greet panel error:", error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          embeds: [InteractionUtils.createErrorEmbed(`${getEmoji("error")} An error occurred: ${error.message}`)],
          ephemeral: true,
        }).catch(() => {});
      }
    }
  });
  
  collector.on("end", () => {
    if (panelMsg && panelMsg.components) {
      panelMsg.edit({
        components: InteractionUtils.disableComponents(panelMsg.components)
      }).catch(() => {});
    }
  });
}

/**
 * Show channel manager with Channel Select Menu
 */
async function showChannelManager(source, panelMsg, isInteraction, settings) {
  const welcome = settings.welcome || {};
  const channels = welcome.channels || [];
  
  const components = [];
  components.push(ContainerBuilder.createTextDisplay("# 📺 Greeting Channels"));
  components.push(ContainerBuilder.createSeparator());
  
  if (channels.length === 0) {
    components.push(ContainerBuilder.createTextDisplay("**No channels configured**\n\nUse the channel selector below to add greeting channels."));
  } else {
    const channelList = channels.map(id => `<#${id}>`).join("\n");
    components.push(ContainerBuilder.createTextDisplay(`**Active Channels (${channels.length}):**\n${channelList}`));
  }
  
  components.push(ContainerBuilder.createSeparator());
  components.push(ContainerBuilder.createTextDisplay("**Select channels from the menu below:**\n• Add new channels\n• Remove existing channels"));
  
  // Create Channel Select Menu
  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId("greet_channel_select")
    .setPlaceholder("📺 Select text channels for greetings")
    .setChannelTypes([ChannelType.GuildText])
    .setMinValues(0)
    .setMaxValues(Math.min(25, Math.max(1, channels.length + 5)));
  
  const selectRow = new ActionRowBuilder().addComponents(channelSelect);
  
  const buttonRow = InteractionUtils.createButtonRow([
    {
      customId: "greet_channel_back",
      label: "Back",
      emoji: "◀️",
      style: ButtonStyle.Secondary,
    },
  ]);
  
  components.push(selectRow);
  components.push(buttonRow);
  
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0xFFFFFF, components: components })
    .build();
  
  await updatePanel(panelMsg, isInteraction, payload);
  
  setupChannelManagerCollector(source, panelMsg, isInteraction, settings);
}

/**
 * Setup channel manager collector
 */
function setupChannelManagerCollector(source, panelMsg, isInteraction, settings) {
  const userId = isInteraction ? source.user.id : source.author.id;
  
  const collector = panelMsg.createMessageComponentCollector({
    filter: (i) => i.user.id === userId,
    time: 120000,
  });
  
  collector.on("collect", async (interaction) => {
    try {
      if (interaction.customId === "greet_channel_select") {
        await interaction.deferUpdate();
        
        const selectedChannels = interaction.values;
        
        // Validate permissions
        const invalidChannels = [];
        for (const channelId of selectedChannels) {
          const channel = interaction.guild.channels.cache.get(channelId);
          if (channel && !channel.permissionsFor(interaction.guild.members.me).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
            invalidChannels.push(channel.toString());
          }
        }
        
        if (invalidChannels.length > 0) {
          const components = [];
          components.push(ContainerBuilder.createTextDisplay(
            `# ⚠️ Missing Permissions\n\nI need **SendMessages** and **EmbedLinks** permissions in:\n${invalidChannels.join(", ")}`
          ));
          const backButton = InteractionUtils.createButtonRow([{
            customId: "greet_channel_back",
            label: "Back",
            emoji: "◀️",
            style: ButtonStyle.Secondary,
          }]);
          components.push(backButton);
          
          const payload = new ContainerBuilder()
            .addContainer({ accentColor: 0xFF0000, components: components })
            .build();
          
          await updatePanel(panelMsg, isInteraction, payload);
          return;
        }
        
        // Save channels
        if (!settings.welcome) settings.welcome = { enabled: true };
        settings.welcome.channels = selectedChannels;
        settings.welcome.enabled = selectedChannels.length > 0;
        await settings.save();
        
        collector.stop();
        
        // Show success and auto-return to main
        const components = [];
        components.push(ContainerBuilder.createTextDisplay(
          `# ${getEmoji("success")} Greeting Channels Updated!\n\n` +
          `**Active channels:** ${selectedChannels.length}\n${selectedChannels.map(id => `<#${id}>`).join(", ")}\n\n` +
          `Returning to main panel...`
        ));
        
        const payload = new ContainerBuilder()
          .addContainer({ accentColor: 0x00FF00, components: components })
          .build();
        
        await updatePanel(panelMsg, isInteraction, payload);
        
        // Auto-return to main panel after 2 seconds
        setTimeout(() => showGreetingPanel(source, panelMsg, isInteraction, settings, false), 2000);
        
      } else if (interaction.customId === "greet_channel_back") {
        await interaction.deferUpdate();
        collector.stop();
        await showGreetingPanel(source, panelMsg, isInteraction, settings, false);
      }
    } catch (error) {
      console.error("Channel manager error:", error);
      collector.stop();
    }
  });
  
  collector.on("end", (collected, reason) => {
    if (reason === "time") {
      showGreetingPanel(source, panelMsg, isInteraction, settings, false).catch(() => {});
    }
  });
}

/**
 * Handle message setting with modal
 */
async function handleMessage(interaction, source, panelMsg, isInteraction, settings) {
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
  
  await modalSubmit.deferUpdate();
  
  // Show success and auto-return to main
  const components = [];
  components.push(ContainerBuilder.createTextDisplay(
    `# ${getEmoji("success")} Message Updated\n\n**Preview:**\n${message.substring(0, 200)}${message.length > 200 ? '...' : ''}\n\nReturning to main panel...`
  ));
  
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0x00FF00, components: components })
    .build();
  
  await updatePanel(panelMsg, isInteraction, payload);
  
  setTimeout(() => showGreetingPanel(source, panelMsg, isInteraction, settings, false), 2000);
}

/**
 * Show embed settings
 */
async function showEmbedSettings(source, panelMsg, isInteraction, settings) {
  const currentEnabled = settings.welcome?.embed?.enabled || false;
  
  const components = [];
  components.push(ContainerBuilder.createTextDisplay("# 📋 Embed Mode Settings"));
  components.push(ContainerBuilder.createSeparator());
  components.push(ContainerBuilder.createTextDisplay(
    `**Current Mode:** ${statusEmoji(currentEnabled)} ${currentEnabled ? 'Embed' : 'Plain Text'}\n\n` +
    `Embed mode shows greetings in a styled embed format instead of plain text.`
  ));
  components.push(ContainerBuilder.createSeparator());
  
  const buttonRow = InteractionUtils.createButtonRow([
    {
      customId: `embed_toggle_${!currentEnabled}`,
      label: currentEnabled ? "Disable Embed" : "Enable Embed",
      emoji: currentEnabled ? "📄" : "📋",
      style: currentEnabled ? ButtonStyle.Danger : ButtonStyle.Success,
    },
    {
      customId: "greet_embed_back",
      label: "Back",
      emoji: "◀️",
      style: ButtonStyle.Secondary,
    },
  ]);
  
  components.push(buttonRow);
  
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0xFFFFFF, components: components })
    .build();
  
  await updatePanel(panelMsg, isInteraction, payload);
  
  setupEmbedSettingsCollector(source, panelMsg, isInteraction, settings);
}

/**
 * Setup embed settings collector
 */
function setupEmbedSettingsCollector(source, panelMsg, isInteraction, settings) {
  const userId = isInteraction ? source.user.id : source.author.id;
  
  const collector = panelMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === userId,
    time: 60000,
  });
  
  collector.on("collect", async (interaction) => {
    try {
      if (interaction.customId.startsWith("embed_toggle_")) {
        await interaction.deferUpdate();
        const newEnabled = interaction.customId === "embed_toggle_true";
        
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
        
        collector.stop();
        
        // Show success and auto-return
        const components = [];
        components.push(ContainerBuilder.createTextDisplay(
          `# ${getEmoji("success")} Embed Mode ${newEnabled ? 'Enabled' : 'Disabled'}\n\n` +
          `Greetings will now use ${newEnabled ? '**embed**' : '**plain text**'} format.\n\nReturning to main panel...`
        ));
        
        const payload = new ContainerBuilder()
          .addContainer({ accentColor: 0x00FF00, components: components })
          .build();
        
        await updatePanel(panelMsg, isInteraction, payload);
        setTimeout(() => showGreetingPanel(source, panelMsg, isInteraction, settings, false), 2000);
        
      } else if (interaction.customId === "greet_embed_back") {
        await interaction.deferUpdate();
        collector.stop();
        await showGreetingPanel(source, panelMsg, isInteraction, settings, false);
      }
    } catch (error) {
      console.error("Embed settings error:", error);
      collector.stop();
    }
  });
  
  collector.on("end", (collected, reason) => {
    if (reason === "time") {
      showGreetingPanel(source, panelMsg, isInteraction, settings, false).catch(() => {});
    }
  });
}

/**
 * Show auto-delete settings
 */
async function showAutoDeleteSettings(source, panelMsg, isInteraction, settings) {
  const currentEnabled = settings.welcome?.auto_delete?.enabled || false;
  const currentDelay = settings.welcome?.auto_delete?.delay || 10;
  
  const components = [];
  components.push(ContainerBuilder.createTextDisplay("# 🗑️ Auto-Delete Settings"));
  components.push(ContainerBuilder.createSeparator());
  components.push(ContainerBuilder.createTextDisplay(
    `**Status:** ${statusEmoji(currentEnabled)} ${currentEnabled ? 'Enabled' : 'Disabled'}\n` +
    `**Delay:** ${currentDelay} seconds\n\n` +
    `Auto-delete removes greeting messages after a delay to keep channels clean.`
  ));
  components.push(ContainerBuilder.createSeparator());
  
  const buttonRow = InteractionUtils.createButtonRow([
    {
      customId: `autodel_toggle_${!currentEnabled}`,
      label: currentEnabled ? "Disable" : "Enable",
      emoji: currentEnabled ? "🔴" : "🟢",
      style: currentEnabled ? ButtonStyle.Danger : ButtonStyle.Success,
    },
    {
      customId: "autodel_config",
      label: "Set Delay",
      emoji: "⏱️",
      style: ButtonStyle.Secondary,
      disabled: !currentEnabled,
    },
    {
      customId: "greet_autodel_back",
      label: "Back",
      emoji: "◀️",
      style: ButtonStyle.Secondary,
    },
  ]);
  
  components.push(buttonRow);
  
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0xFFFFFF, components: components })
    .build();
  
  await updatePanel(panelMsg, isInteraction, payload);
  
  setupAutoDeleteCollector(source, panelMsg, isInteraction, settings);
}

/**
 * Setup auto-delete collector
 */
function setupAutoDeleteCollector(source, panelMsg, isInteraction, settings) {
  const userId = isInteraction ? source.user.id : source.author.id;
  
  const collector = panelMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === userId,
    time: 60000,
  });
  
  collector.on("collect", async (interaction) => {
    try {
      if (interaction.customId.startsWith("autodel_toggle_")) {
        await interaction.deferUpdate();
        const newEnabled = interaction.customId === "autodel_toggle_true";
        
        if (!settings.welcome) settings.welcome = {};
        settings.welcome.auto_delete = { enabled: newEnabled, delay: settings.welcome.auto_delete?.delay || 10 };
        await settings.save();
        
        collector.stop();
        
        // Show success and auto-return
        const components = [];
        components.push(ContainerBuilder.createTextDisplay(
          `# ${getEmoji("success")} Auto-Delete ${newEnabled ? 'Enabled' : 'Disabled'}\n\nReturning to main panel...`
        ));
        
        const payload = new ContainerBuilder()
          .addContainer({ accentColor: 0x00FF00, components: components })
          .build();
        
        await updatePanel(panelMsg, isInteraction, payload);
        setTimeout(() => showGreetingPanel(source, panelMsg, isInteraction, settings, false), 2000);
        
      } else if (interaction.customId === "autodel_config") {
        const currentDelay = settings.welcome?.auto_delete?.delay || 10;
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
        
        await interaction.showModal(modal);
        
        const modalSubmit = await InteractionUtils.awaitModalSubmit(interaction, "autodel_delay_modal", 120000);
        if (!modalSubmit) return;
        
        const delay = parseInt(modalSubmit.fields.getTextInputValue("delay")) || 10;
        const clampedDelay = Math.max(5, Math.min(300, delay));
        
        if (!settings.welcome) settings.welcome = {};
        settings.welcome.auto_delete = { enabled: true, delay: clampedDelay };
        await settings.save();
        
        await modalSubmit.deferUpdate();
        
        collector.stop();
        
        // Show success and auto-return
        const components = [];
        components.push(ContainerBuilder.createTextDisplay(
          `# ${getEmoji("success")} Auto-Delete Configured\n\n` +
          `Greetings will be deleted after **${clampedDelay} seconds**.\n\nReturning to main panel...`
        ));
        
        const payload = new ContainerBuilder()
          .addContainer({ accentColor: 0x00FF00, components: components })
          .build();
        
        await updatePanel(panelMsg, isInteraction, payload);
        setTimeout(() => showGreetingPanel(source, panelMsg, isInteraction, settings, false), 2000);
        
      } else if (interaction.customId === "greet_autodel_back") {
        await interaction.deferUpdate();
        collector.stop();
        await showGreetingPanel(source, panelMsg, isInteraction, settings, false);
      }
    } catch (error) {
      console.error("Auto-delete settings error:", error);
      collector.stop();
    }
  });
  
  collector.on("end", (collected, reason) => {
    if (reason === "time") {
      showGreetingPanel(source, panelMsg, isInteraction, settings, false).catch(() => {});
    }
  });
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
 * Show variables panel
 */
async function showVariables(source, panelMsg, isInteraction, settings) {
  const components = [];
  components.push(ContainerBuilder.createTextDisplay("# 📝 Available Variables"));
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
  components.push(ContainerBuilder.createSeparator());
  
  const backButton = InteractionUtils.createButtonRow([
    {
      customId: "greet_variables_back",
      label: "Back",
      emoji: "◀️",
      style: ButtonStyle.Secondary,
    },
  ]);
  
  components.push(backButton);
  
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0xFFFFFF, components: components })
    .build();
  
  await updatePanel(panelMsg, isInteraction, payload);
  
  setupVariablesCollector(source, panelMsg, isInteraction, settings);
}

/**
 * Setup variables collector
 */
function setupVariablesCollector(source, panelMsg, isInteraction, settings) {
  const userId = isInteraction ? source.user.id : source.author.id;
  
  const collector = panelMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === userId,
    time: 60000,
  });
  
  collector.on("collect", async (interaction) => {
    try {
      if (interaction.customId === "greet_variables_back") {
        await interaction.deferUpdate();
        collector.stop();
        await showGreetingPanel(source, panelMsg, isInteraction, settings, false);
      }
    } catch (error) {
      console.error("Variables panel error:", error);
      collector.stop();
    }
  });
  
  collector.on("end", (collected, reason) => {
    if (reason === "time") {
      showGreetingPanel(source, panelMsg, isInteraction, settings, false).catch(() => {});
    }
  });
}
