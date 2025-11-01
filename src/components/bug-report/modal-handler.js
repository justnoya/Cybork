const { OWNER_IDS } = require("@root/config.js");
const emojis = require("@root/emojis.json");
const ContainerBuilder = require("@helpers/ContainerBuilder");
const { ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require("discord.js");

/**
 * Handle bug report modal submissions with attachment support
 */
module.exports = async ({ interaction, client }) => {
  await interaction.deferReply({ ephemeral: true });

  const title = interaction.fields.getTextInputValue("bug-title");
  const description = interaction.fields.getTextInputValue("bug-description");
  const steps = interaction.fields.getTextInputValue("bug-steps");
  const expected = interaction.fields.getTextInputValue("bug-expected") || "Not specified";
  const additional = interaction.fields.getTextInputValue("bug-additional") || "None";

  const user = interaction.user;
  const guild = interaction.guild;

  // Ask if user wants to add screenshots/attachments
  const attachmentButton = new ButtonBuilder()
    .setCustomId("bug_add_attachment")
    .setLabel("Add Screenshots/Files")
    .setEmoji("📎")
    .setStyle(ButtonStyle.Primary);

  const skipButton = new ButtonBuilder()
    .setCustomId("bug_skip_attachment")
    .setLabel("Skip - Submit Now")
    .setEmoji("✅")
    .setStyle(ButtonStyle.Success);

  const buttonRow = new ActionRowBuilder().addComponents(attachmentButton, skipButton);

  const attachmentPromptText = `# 📝 Bug Report Ready\n\n` +
    `**Title:** ${title}\n\n` +
    `Would you like to add screenshots, error messages, or other files to help us understand the issue better?\n\n` +
    `Click **Add Screenshots/Files** to upload attachments, or **Skip - Submit Now** to submit without attachments.`;

  const attachmentPrompt = new ContainerBuilder()
    .addContainer({
      accentColor: 0x5865F2,
      components: [
        ContainerBuilder.createTextDisplay(attachmentPromptText),
        buttonRow
      ]
    })
    .build();

  await interaction.editReply(attachmentPrompt);

  // Wait for user response
  const collector = interaction.channel.createMessageComponentCollector({
    filter: (i) => i.user.id === user.id && (i.customId === "bug_add_attachment" || i.customId === "bug_skip_attachment"),
    time: 120000,
    max: 1
  });

  let attachments = [];

  collector.on("collect", async (buttonInteraction) => {
    if (buttonInteraction.customId === "bug_add_attachment") {
      await buttonInteraction.update({
        embeds: [{
          color: 0x5865F2,
          title: "📎 Upload Attachments",
          description: `Please send your screenshots, error logs, or other files in the next message.\n\n` +
            `You have **60 seconds** to upload your files.\n\n` +
            `*Send multiple files in a single message if needed.*`
        }],
        components: []
      });

      // Create message collector for attachments
      const messageCollector = interaction.channel.createMessageCollector({
        filter: (m) => m.author.id === user.id,
        time: 60000,
        max: 1
      });

      messageCollector.on("collect", async (message) => {
        if (message.attachments.size > 0) {
          attachments = Array.from(message.attachments.values());
          await message.delete().catch(() => {});
          await sendBugReport(interaction, client, user, guild, title, description, steps, expected, additional, attachments);
        } else {
          await interaction.editReply({
            embeds: [{
              color: 0xFF0000,
              title: "❌ No Attachments",
              description: "No files were attached. Submitting bug report without attachments..."
            }],
            components: []
          });
          await sendBugReport(interaction, client, user, guild, title, description, steps, expected, additional, []);
        }
      });

      messageCollector.on("end", async (collected) => {
        if (collected.size === 0) {
          await interaction.editReply({
            embeds: [{
              color: 0xFFFFFF,
              title: "⏱️ Timeout",
              description: "No attachments received. Submitting bug report without attachments..."
            }],
            components: []
          });
          await sendBugReport(interaction, client, user, guild, title, description, steps, expected, additional, []);
        }
      });
    } else {
      // Skip attachments
      await buttonInteraction.update({ components: [] });
      await sendBugReport(interaction, client, user, guild, title, description, steps, expected, additional, []);
    }
  });

  collector.on("end", async (collected) => {
    if (collected.size === 0) {
      await interaction.editReply({
        embeds: [{
          color: 0xFFFFFF,
          title: "⏱️ Timeout",
          description: "No response received. Submitting bug report without attachments..."
        }],
        components: []
      });
      await sendBugReport(interaction, client, user, guild, title, description, steps, expected, additional, []);
    }
  });
};

/**
 * Send the bug report to owners
 */
async function sendBugReport(interaction, client, user, guild, title, description, steps, expected, additional, attachments) {
  // Build bug report for owner
  const ownerReportText = `${require("@root/emojis.json").error} **New Bug Report**\n\n` +
    `**Reporter Information**\n` +
    `${require("@root/emojis.json").user} User: ${user.tag} (${user.id})\n` +
    `${require("@root/emojis.json").server} Server: ${guild?.name || 'DM'} (${guild?.id || 'N/A'})\n` +
    `${require("@root/emojis.json").clock} Time: <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
    `**Bug Title**\n${title}\n\n` +
    `**Description**\n${description}\n\n` +
    `**Steps to Reproduce**\n${steps}\n\n` +
    `**Expected Behavior**\n${expected}\n\n` +
    `**Additional Information**\n${additional}\n\n` +
    `**Attachments:** ${attachments.length > 0 ? `${attachments.length} file(s) attached` : 'None'}`;

  const ownerReport = ContainerBuilder.quickMessage(
    null,
    ownerReportText,
    [],
    0xFF0000
  );

  // Send to each owner
  let sentCount = 0;
  for (const ownerId of require("@root/config.js").OWNER_IDS) {
    try {
      const owner = await client.users.fetch(ownerId);
      const msg = await owner.send(ownerReport);
      
      // Send attachments if any
      if (attachments.length > 0) {
        await owner.send({
          content: `**Attachments for bug report: "${title}"**`,
          files: attachments.map(att => att.url)
        });
      }
      
      sentCount++;
    } catch (error) {
      client.logger.error(`Failed to send bug report to owner ${ownerId}`, error);
    }
  }

  if (sentCount === 0) {
    return interaction.editReply({
      embeds: [{
        color: 0xFF0000,
        title: "❌ Error",
        description: "Failed to send bug report. Please try again later or contact support."
      }],
      components: []
    });
  }

  // Send confirmation to user
  const confirmationText = `# ✅ Bug Report Submitted\n\n` +
    `**Thank you for reporting this bug!**\n\n` +
    `Your report has been successfully submitted to the development team. We appreciate your feedback and will review it as soon as possible.\n\n` +
    `**Report Details**\n` +
    `📋 Title: ${title}\n` +
    `📎 Attachments: ${attachments.length} file(s)\n` +
    `✅ Status: Pending Review\n\n` +
    `*You can close this message.*`;

  const confirmation = new ContainerBuilder()
    .addContainer({
      accentColor: 0x43B581,
      components: [ContainerBuilder.createTextDisplay(confirmationText)]
    })
    .build();

  return interaction.editReply(confirmation);
}
