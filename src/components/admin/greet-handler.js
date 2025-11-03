const ModernEmbed = require("@helpers/ModernEmbed");
const EmojiManager = require("@helpers/EmojiManager");
const { ChannelType, StringSelectMenuBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = async function handleGreetInteraction(interaction) {
  if (!interaction.customId?.startsWith("greet")) return;

  const parts = interaction.customId.split("_");
  const action = parts[1];

  try {
    if (interaction.isButton()) {
      if (action === "test") {
        await handleTestGreeting(interaction);
      } else if (action === "channels") {
        await showChannelManager(interaction);
      } else if (action === "message") {
        await showMessageEditor(interaction);
      } else if (action === "embed") {
        await showEmbedSettings(interaction);
      } else if (action === "autodel") {
        await showAutoDeleteSettings(interaction);
      } else if (action === "variables") {
        await showVariableList(interaction);
      } else if (action === "toggle") {
        await handleToggle(interaction, parts[2]);
      }
    } else if (interaction.isStringSelectMenu()) {
      if (action === "channels") {
        await handleChannelSelection(interaction, parts[2]);
      } else if (action === "settings") {
        await handleSettingsSelection(interaction);
      }
    } else if (interaction.isModalSubmit()) {
      if (action === "message") {
        await handleMessageSubmit(interaction);
      } else if (action === "embed") {
        await handleEmbedSubmit(interaction);
      } else if (action === "autodel") {
        await handleAutoDeleteSubmit(interaction);
      }
    }
  } catch (error) {
    console.error("[Greet Handler] Error:", error);
    const reply = { 
      embeds: [ModernEmbed.simpleError(`${EmojiManager.getError()} Failed to process: ${error.message}`).embeds[0]],
      ephemeral: true 
    };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
};

async function handleTestGreeting(interaction) {
  const { getSettings } = require("@schemas/Guild");
  const { buildGreeting } = require("@handlers/greeting");
  const settings = await getSettings(interaction.guild);

  if (!settings.welcome?.enabled) {
    return interaction.reply({
      embeds: [ModernEmbed.simpleError(`${EmojiManager.getError()} Welcome system is not enabled`).embeds[0]],
      ephemeral: true
    });
  }

  const channel = interaction.guild.channels.cache.get(settings.welcome.channels?.[0]);
  if (!channel) {
    return interaction.reply({
      embeds: [ModernEmbed.simpleError(`${EmojiManager.getError()} No welcome channel configured`).embeds[0]],
      ephemeral: true
    });
  }

  try {
    const greeting = await buildGreeting(interaction.member, "WELCOME", settings.welcome);
    await channel.send(greeting);
    return interaction.reply({
      embeds: [ModernEmbed.simpleSuccess(`${EmojiManager.getSuccess()} Test greeting sent to ${channel}`).embeds[0]],
      ephemeral: true
    });
  } catch (error) {
    return interaction.reply({
      embeds: [ModernEmbed.simpleError(`${EmojiManager.getError()} Failed: ${error.message}`).embeds[0]],
      ephemeral: true
    });
  }
}

async function showChannelManager(interaction) {
  const { getSettings } = require("@schemas/Guild");
  const settings = await getSettings(interaction.guild);
  const welcome = settings.welcome || {};
  const channels = welcome.channels || [];

  const textChannels = interaction.guild.channels.cache
    .filter(ch => ch.type === ChannelType.GuildText && ch.permissionsFor(interaction.guild.members.me).has(["ViewChannel", "SendMessages"]))
    .first(25);

  if (textChannels.length === 0) {
    return interaction.reply({
      embeds: [ModernEmbed.simpleError(`${EmojiManager.getError()} No text channels available`).embeds[0]],
      ephemeral: true
    });
  }

  const menuOptions = textChannels.map(ch => {
    const option = {
      label: `#${ch.name}`,
      value: ch.id,
      description: `${ch.memberCount || 0} members can view`,
      default: channels.includes(ch.id)
    };
    
    if (channels.includes(ch.id)) {
      option.emoji = EmojiManager.get("yes", "✅");
    }
    
    return option;
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("greet_channels_toggle")
    .setPlaceholder(`${EmojiManager.get("settings", "⚙️")} Select channels to toggle`)
    .setMinValues(0)
    .setMaxValues(Math.min(menuOptions.length, 25))
    .addOptions(menuOptions);

  const embed = new ModernEmbed()
    .setColor(0xFFFFFF)
    .setHeader(`${EmojiManager.get("settings", "⚙️")} Greeting Channels`, 
      `**Active Channels:** ${channels.length}\n\n` +
      (channels.length > 0 ? channels.map(id => `<#${id}>`).join(", ") : "None configured") +
      `\n\n${EmojiManager.get("info", "ℹ️")} Select channels from the menu below to toggle them.`
    );

  const backButton = new ButtonBuilder()
    .setCustomId("greet_back")
    .setLabel("Back")
    .setEmoji(EmojiManager.get("arrow_left", "◀️"))
    .setStyle(ButtonStyle.Secondary);

  await interaction.reply({
    ...embed.toMessage(),
    components: [new ActionRowBuilder().addComponents(selectMenu), new ActionRowBuilder().addComponents(backButton)],
    ephemeral: true
  });
}

async function handleChannelSelection(interaction, subAction) {
  const { getSettings } = require("@schemas/Guild");
  const settings = await getSettings(interaction.guild);
  
  if (!settings.welcome) settings.welcome = {};
  const selected = interaction.values;
  
  settings.welcome.channels = selected;
  if (selected.length > 0 && !settings.welcome.enabled) {
    settings.welcome.enabled = true;
  }
  
  await settings.save();

  await interaction.update({
    embeds: [ModernEmbed.simpleSuccess(
      `${EmojiManager.getSuccess()} Updated greeting channels!\n\n` +
      `**Active Channels:** ${selected.length}\n` +
      (selected.length > 0 ? selected.map(id => `<#${id}>`).join(", ") : "None")
    ).embeds[0]],
    components: []
  });
}

async function showMessageEditor(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("greet_message")
    .setTitle("Set Welcome Message");

  const { getSettings } = require("@schemas/Guild");
  const settings = await getSettings(interaction.guild);
  const currentMessage = settings.welcome?.content || settings.welcome?.embed?.description || "";

  const messageInput = new TextInputBuilder()
    .setCustomId("message")
    .setLabel("Welcome Message")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Welcome {member:mention} to {server}! You are member #{count}!")
    .setValue(currentMessage)
    .setRequired(true)
    .setMaxLength(2000);

  modal.addComponents(new ActionRowBuilder().addComponents(messageInput));
  await interaction.showModal(modal);
}

async function handleMessageSubmit(interaction) {
  const { getSettings } = require("@schemas/Guild");
  const settings = await getSettings(interaction.guild);
  
  if (!settings.welcome) settings.welcome = { enabled: false, channels: [], embed: {} };
  
  const message = interaction.fields.getTextInputValue("message");
  
  if (settings.welcome.embed?.enabled) {
    settings.welcome.embed.description = message;
  } else {
    settings.welcome.content = message;
  }
  
  await settings.save();

  await interaction.reply({
    embeds: [ModernEmbed.simpleSuccess(
      `${EmojiManager.getSuccess()} Welcome message updated!\n\n` +
      `**Preview:** ${message.substring(0, 100)}${message.length > 100 ? "..." : ""}`
    ).embeds[0]],
    ephemeral: true
  });
}

async function showEmbedSettings(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("greet_embed")
    .setTitle("Embed Settings");

  const { getSettings } = require("@schemas/Guild");
  const settings = await getSettings(interaction.guild);
  const embed = settings.welcome?.embed || {};

  const toggleInput = new TextInputBuilder()
    .setCustomId("enabled")
    .setLabel("Enable Embed Mode? (yes/no)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("yes or no")
    .setValue(embed.enabled ? "yes" : "no")
    .setRequired(true)
    .setMaxLength(3);

  const colorInput = new TextInputBuilder()
    .setCustomId("color")
    .setLabel("Embed Color (hex code)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("#FFFFFF")
    .setValue(embed.color || "#FFFFFF")
    .setRequired(false)
    .setMaxLength(7);

  const footerInput = new TextInputBuilder()
    .setCustomId("footer")
    .setLabel("Footer Text (optional)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Welcome to {server}!")
    .setValue(embed.footer || "")
    .setRequired(false)
    .setMaxLength(200);

  modal.addComponents(
    new ActionRowBuilder().addComponents(toggleInput),
    new ActionRowBuilder().addComponents(colorInput),
    new ActionRowBuilder().addComponents(footerInput)
  );

  await interaction.showModal(modal);
}

async function handleEmbedSubmit(interaction) {
  const { getSettings } = require("@schemas/Guild");
  const settings = await getSettings(interaction.guild);
  
  if (!settings.welcome) settings.welcome = { enabled: false, channels: [], embed: {} };
  if (!settings.welcome.embed) settings.welcome.embed = {};
  
  const enabled = interaction.fields.getTextInputValue("enabled").toLowerCase() === "yes";
  const color = interaction.fields.getTextInputValue("color");
  const footer = interaction.fields.getTextInputValue("footer");
  
  settings.welcome.embed.enabled = enabled;
  if (color) settings.welcome.embed.color = color;
  if (footer) settings.welcome.embed.footer = footer;
  settings.welcome.embed.thumbnail = true;
  
  await settings.save();

  await interaction.reply({
    embeds: [ModernEmbed.simpleSuccess(
      `${EmojiManager.getSuccess()} Embed settings updated!\n\n` +
      `**Embed Mode:** ${enabled ? "Enabled" : "Disabled"}\n` +
      `**Color:** ${color}\n` +
      `**Footer:** ${footer || "None"}`
    ).embeds[0]],
    ephemeral: true
  });
}

async function showAutoDeleteSettings(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("greet_autodel")
    .setTitle("Auto-Delete Settings");

  const { getSettings } = require("@schemas/Guild");
  const settings = await getSettings(interaction.guild);
  const autoDel = settings.welcome?.auto_delete || {};

  const enableInput = new TextInputBuilder()
    .setCustomId("enabled")
    .setLabel("Enable Auto-Delete? (yes/no)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("yes or no")
    .setValue(autoDel.enabled ? "yes" : "no")
    .setRequired(true);

  const delayInput = new TextInputBuilder()
    .setCustomId("delay")
    .setLabel("Delete After (seconds)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("10")
    .setValue(String(autoDel.delay || 10))
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(enableInput),
    new ActionRowBuilder().addComponents(delayInput)
  );

  await interaction.showModal(modal);
}

async function handleAutoDeleteSubmit(interaction) {
  const { getSettings } = require("@schemas/Guild");
  const settings = await getSettings(interaction.guild);
  
  if (!settings.welcome) settings.welcome = { enabled: false, channels: [], embed: {} };
  if (!settings.welcome.auto_delete) settings.welcome.auto_delete = {};
  
  const enabled = interaction.fields.getTextInputValue("enabled").toLowerCase() === "yes";
  const delay = parseInt(interaction.fields.getTextInputValue("delay")) || 10;
  
  settings.welcome.auto_delete.enabled = enabled;
  settings.welcome.auto_delete.delay = Math.max(1, Math.min(delay, 300));
  
  await settings.save();

  await interaction.reply({
    embeds: [ModernEmbed.simpleSuccess(
      `${EmojiManager.getSuccess()} Auto-delete updated!\n\n` +
      `**Status:** ${enabled ? "Enabled" : "Disabled"}\n` +
      `**Delay:** ${settings.welcome.auto_delete.delay}s`
    ).embeds[0]],
    ephemeral: true
  });
}

async function showVariableList(interaction) {
  const embed = new ModernEmbed()
    .setColor(0xFFFFFF)
    .setHeader(`${EmojiManager.get("info", "ℹ️")} Available Variables`, 
      "Use these variables in your welcome messages:\n\n" +
      "**Member Variables:**\n" +
      "`{member:mention}` - Mention the member\n" +
      "`{member:name}` - Member's username\n" +
      "`{member:tag}` - Member's tag\n" +
      "`{member:nick}` - Member's nickname\n" +
      "`{member:avatar}` - Member's avatar URL\n\n" +
      "**Server Variables:**\n" +
      "`{server}` - Server name\n" +
      "`{count}` - Total member count\n\n" +
      "**Inviter Variables:**\n" +
      "`{inviter:name}` - Inviter's name\n" +
      "`{inviter:tag}` - Inviter's tag\n" +
      "`{invites}` - Inviter's invite count"
    );

  await interaction.reply({
    ...embed.toMessage(),
    ephemeral: true
  });
}

async function handleToggle(interaction, type) {
  const { getSettings } = require("@schemas/Guild");
  const settings = await getSettings(interaction.guild);
  
  if (!settings.welcome) settings.welcome = { enabled: false, channels: [], embed: {} };
  
  if (type === "system") {
    settings.welcome.enabled = !settings.welcome.enabled;
  }
  
  await settings.save();

  await interaction.update({
    embeds: [ModernEmbed.simpleSuccess(
      `${EmojiManager.getSuccess()} Welcome system ${settings.welcome.enabled ? "enabled" : "disabled"}!`
    ).embeds[0]],
    components: []
  });
}
