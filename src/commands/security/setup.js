const { ApplicationCommandOptionType, ComponentType, ButtonStyle, UserSelectMenuBuilder, ActionRowBuilder } = require("discord.js");
const ContainerBuilder = require("@helpers/ContainerBuilder");
const InteractionUtils = require("@helpers/InteractionUtils");
const { getEmoji, statusEmoji } = require("@helpers/EmojiUtils");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "setup",
  description: "Interactive security setup wizard to protect your server",
  category: "ANTINUKE",
  userPermissions: ["Administrator"],
  botPermissions: ["Administrator"],
  command: {
    enabled: true,
    aliases: ["securitysetup", "setupsecurity"],
  },
  slashCommand: {
    enabled: true,
    ephemeral: true,
  },

  async messageRun(message, args, data) {
    await showSetupWizard(message, false, data.settings);
  },

  async interactionRun(interaction, data) {
    await interaction.deferReply({ ephemeral: true });
    await showSetupWizard(interaction, true, data.settings);
  },
};

/**
 * Show the main security setup wizard
 */
async function showSetupWizard(source, isInteraction, settings) {
  const components = [];
  
  components.push(ContainerBuilder.createTextDisplay("# 🛡️ Security Setup Wizard"));
  components.push(ContainerBuilder.createSeparator());
  
  components.push(ContainerBuilder.createTextDisplay(
    "## Welcome to Server Security Setup\n\n" +
    "This wizard will guide you through setting up comprehensive security for your server. " +
    "We'll configure protections against:\n\n" +
    "• **Malicious Activities** - Ban/Kick spam, role manipulation\n" +
    "• **Content Moderation** - Auto-detection of spam, links, bad words\n" +
    "• **Channel Protection** - Prevent mass channel creation/deletion\n" +
    "• **Admin Whitelist** - Trusted users exempt from protection"
  ));
  
  components.push(ContainerBuilder.createSeparator());
  
  // Current Security Status
  const antinukeEnabled = settings.antinuke?.enabled || false;
  const automodEnabled = settings.automod?.anti_spam?.enabled || settings.automod?.anti_links || false;
  const whitelistCount = settings.antinuke?.whitelist?.length || 0;
  
  components.push(ContainerBuilder.createTextDisplay(
    `**Current Security Status:**\n` +
    `${statusEmoji(antinukeEnabled)} Anti-Nuke Protection: ${antinukeEnabled ? 'Active' : 'Disabled'}\n` +
    `${statusEmoji(automodEnabled)} Auto-Moderation: ${automodEnabled ? 'Active' : 'Disabled'}\n` +
    `👥 Whitelisted Admins: ${whitelistCount}`
  ));
  
  const buttonRow1 = InteractionUtils.createButtonRow([
    {
      customId: "setup_quick",
      label: "Quick Setup (Recommended)",
      emoji: "⚡",
      style: ButtonStyle.Success,
    },
    {
      customId: "setup_custom",
      label: "Custom Setup",
      emoji: "⚙️",
      style: ButtonStyle.Primary,
    },
  ]);
  
  const buttonRow2 = InteractionUtils.createButtonRow([
    {
      customId: "setup_antinuke",
      label: "Anti-Nuke Only",
      emoji: "🛡️",
      style: ButtonStyle.Secondary,
    },
    {
      customId: "setup_automod",
      label: "Auto-Mod Only",
      emoji: "🤖",
      style: ButtonStyle.Secondary,
    },
  ]);
  
  components.push(buttonRow1);
  components.push(buttonRow2);
  
  const payload = new ContainerBuilder()
    .addContainer({
      accentColor: 0x5865F2,
      components: components
    })
    .build();
  
  const msg = isInteraction
    ? await source.editReply(payload)
    : await source.safeReply(payload);
  
  setupWizardCollector(msg, source, isInteraction, settings);
}

/**
 * Setup wizard collector
 */
function setupWizardCollector(message, source, isInteraction, settings) {
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === (isInteraction ? source.user.id : source.author.id),
    time: 300000,
  });
  
  collector.on("collect", async (interaction) => {
    try {
      switch (interaction.customId) {
        case "setup_quick":
          await handleQuickSetup(interaction, source, isInteraction, settings);
          break;
        case "setup_custom":
          await handleCustomSetup(interaction, source, isInteraction, settings);
          break;
        case "setup_antinuke":
          await handleAntinukeSetup(interaction, source, isInteraction, settings);
          break;
        case "setup_automod":
          await handleAutomodSetup(interaction, source, isInteraction, settings);
          break;
      }
    } catch (error) {
      console.error("Setup wizard error:", error);
      await interaction.reply({
        content: `${getEmoji("error")} An error occurred: ${error.message}`,
        ephemeral: true,
      }).catch(() => {});
    }
  });
}

/**
 * Handle quick setup - Enable all protections with recommended settings
 */
async function handleQuickSetup(interaction, source, isInteraction, settings) {
  await interaction.deferUpdate();
  
  // Enable Anti-Nuke with recommended settings
  if (!settings.antinuke) settings.antinuke = {};
  settings.antinuke.enabled = true;
  settings.antinuke.punishment = "BAN";
  settings.antinuke.anti_ban = { enabled: true, limit: 3 };
  settings.antinuke.anti_kick = { enabled: true, limit: 3 };
  settings.antinuke.anti_role = { enabled: true, limit: 5 };
  settings.antinuke.anti_channel = { enabled: true, limit: 3 };
  settings.antinuke.anti_webhook = { enabled: true };
  settings.antinuke.anti_emoji = { enabled: true, limit: 5 };
  
  // Enable Auto-Mod with recommended settings
  if (!settings.automod) settings.automod = {};
  settings.automod.anti_spam = { enabled: true, threshold: 5, timeframe: 5 };
  settings.automod.anti_links = true;
  settings.automod.anti_zalgo = { enabled: true, threshold: 50 };
  settings.automod.anti_caps = { enabled: true, threshold: 70, min_length: 10 };
  
  await settings.save();
  
  // Show whitelist setup
  await showWhitelistSetup(interaction, source, isInteraction, settings, true);
}

/**
 * Show whitelist setup for trusted admins
 */
async function showWhitelistSetup(interaction, source, isInteraction, settings, isQuickSetup) {
  const components = [];
  
  components.push(ContainerBuilder.createTextDisplay("## 👥 Whitelist Trusted Admins"));
  components.push(ContainerBuilder.createSeparator());
  
  components.push(ContainerBuilder.createTextDisplay(
    "**Add trusted administrators to the whitelist**\n\n" +
    "Whitelisted users are exempt from anti-nuke protections. " +
    "Only whitelist users you completely trust with server administration.\n\n" +
    "Select administrators from the menu below:"
  ));
  
  const userSelect = new UserSelectMenuBuilder()
    .setCustomId("setup_whitelist_select")
    .setPlaceholder("👥 Select trusted administrators")
    .setMinValues(0)
    .setMaxValues(Math.min(25, 10));
  
  const selectRow = new ActionRowBuilder().addComponents(userSelect);
  
  const buttonRow = InteractionUtils.createButtonRow([
    {
      customId: "setup_whitelist_save",
      label: "Save Whitelist",
      emoji: "✅",
      style: ButtonStyle.Success,
    },
    {
      customId: "setup_whitelist_skip",
      label: "Skip",
      emoji: "➡️",
      style: ButtonStyle.Secondary,
    },
  ]);
  
  components.push(selectRow);
  components.push(buttonRow);
  
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0x5865F2, components: components })
    .build();
  
  await interaction.editReply(payload);
  
  const response = await InteractionUtils.awaitComponent(
    await interaction.fetchReply(),
    interaction.user.id,
    { componentType: [ComponentType.UserSelect, ComponentType.Button] },
    120000
  );
  
  if (!response) {
    return finishSetup(interaction, settings, isQuickSetup);
  }
  
  if (response.customId === "setup_whitelist_select") {
    const selectedUsers = response.values;
    response.tempWhitelist = selectedUsers;
    
    await response.update({
      content: `${getEmoji("success")} Admins Selected\n\n` +
        `${selectedUsers.length} user(s) selected:\n${selectedUsers.map(id => `<@${id}>`).join(", ")}\n\n` +
        `Click **Save Whitelist** to add them.`,
      embeds: [],
      components: [buttonRow]
    });
    
    const saveResponse = await InteractionUtils.awaitComponent(
      await response.message,
      interaction.user.id,
      { componentType: ComponentType.Button },
      60000
    );
    
    if (saveResponse && saveResponse.customId === "setup_whitelist_save") {
      if (!settings.antinuke) settings.antinuke = {};
      settings.antinuke.whitelist = response.tempWhitelist || selectedUsers;
      await settings.save();
      
      await finishSetup(saveResponse, settings, isQuickSetup);
    } else {
      await finishSetup(response, settings, isQuickSetup);
    }
  } else if (response.customId === "setup_whitelist_save" || response.customId === "setup_whitelist_skip") {
    await finishSetup(response, settings, isQuickSetup);
  }
}

/**
 * Finish setup and show summary
 */
async function finishSetup(interaction, settings, isQuickSetup) {
  const setupType = isQuickSetup ? "Quick Setup" : "Custom Setup";
  
  const summaryText = `# ✅ Security Setup Complete!\n\n` +
    `**${setupType} has been applied successfully.**\n\n` +
    `**Enabled Protections:**\n` +
    `${statusEmoji(settings.antinuke?.enabled)} Anti-Nuke Protection\n` +
    `${statusEmoji(settings.automod?.anti_spam?.enabled)} Anti-Spam\n` +
    `${statusEmoji(settings.automod?.anti_links)} Anti-Link\n` +
    `${statusEmoji(settings.automod?.anti_zalgo?.enabled)} Anti-Zalgo\n` +
    `${statusEmoji(settings.automod?.anti_caps?.enabled)} Anti-Caps\n\n` +
    `**Whitelisted Admins:** ${settings.antinuke?.whitelist?.length || 0}\n\n` +
    `Your server is now protected! Use individual commands to fine-tune settings:\n` +
    `• \`/antinuke\` - Configure anti-nuke\n` +
    `• \`/automod\` - Configure auto-moderation`;
  
  const summary = new ContainerBuilder()
    .addContainer({
      accentColor: 0x43B581,
      components: [ContainerBuilder.createTextDisplay(summaryText)]
    })
    .build();
  
  await interaction.update(summary);
}

/**
 * Handle custom setup - Step-by-step configuration
 */
async function handleCustomSetup(interaction, source, isInteraction, settings) {
  await interaction.update({
    embeds: [InteractionUtils.createSuccessEmbed(
      `${getEmoji("success")} Custom Setup\n\n` +
      `Custom setup allows you to configure each protection individually.\n\n` +
      `Use these commands:\n` +
      `• \`/antinuke setup\` - Configure anti-nuke protections\n` +
      `• \`/automod\` - Configure auto-moderation\n` +
      `• \`/antiban\`, \`/antikick\` - Individual modules\n\n` +
      `Or try **Quick Setup** for instant protection with recommended settings.`
    )],
    components: []
  });
}

/**
 * Handle anti-nuke only setup
 */
async function handleAntinukeSetup(interaction, source, isInteraction, settings) {
  if (!settings.antinuke) settings.antinuke = {};
  settings.antinuke.enabled = true;
  settings.antinuke.punishment = "BAN";
  settings.antinuke.anti_ban = { enabled: true, limit: 3 };
  settings.antinuke.anti_kick = { enabled: true, limit: 3 };
  settings.antinuke.anti_role = { enabled: true, limit: 5 };
  settings.antinuke.anti_channel = { enabled: true, limit: 3 };
  settings.antinuke.anti_webhook = { enabled: true };
  
  await settings.save();
  
  await showWhitelistSetup(interaction, source, isInteraction, settings, false);
}

/**
 * Handle auto-mod only setup
 */
async function handleAutomodSetup(interaction, source, isInteraction, settings) {
  if (!settings.automod) settings.automod = {};
  settings.automod.anti_spam = { enabled: true, threshold: 5, timeframe: 5 };
  settings.automod.anti_links = true;
  settings.automod.anti_zalgo = { enabled: true, threshold: 50 };
  settings.automod.anti_caps = { enabled: true, threshold: 70, min_length: 10 };
  
  await settings.save();
  
  await interaction.update({
    embeds: [InteractionUtils.createSuccessEmbed(
      `${getEmoji("success")} Auto-Moderation Enabled!\n\n` +
      `All auto-moderation features have been enabled with recommended settings:\n\n` +
      `${statusEmoji(true)} Anti-Spam (5 msgs/5s)\n` +
      `${statusEmoji(true)} Anti-Link\n` +
      `${statusEmoji(true)} Anti-Zalgo (50% threshold)\n` +
      `${statusEmoji(true)} Anti-Caps (70% threshold)\n\n` +
      `Use \`/automod\` to fine-tune these settings.`
    )],
    components: []
  });
}
