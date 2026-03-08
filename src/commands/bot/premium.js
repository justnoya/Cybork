const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const ContainerBuilder = require("@helpers/ContainerBuilder");
const emojis = require("@root/emojis.json");
const { SUPPORT_SERVER } = require("@root/config");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "premium",
  description: "View premium features and subscription plans",
  category: "BOT",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    aliases: ["vip", "pro"],
  },
  slashCommand: {
    enabled: true,
    ephemeral: false,
    options: [],
  },

  async messageRun(message, args) {
    const response = getPremiumMessage();
    await message.channel.send(response);
  },

  async interactionRun(interaction) {
    const response = getPremiumMessage();
    await interaction.followUp(response);
  },
};

function getPremiumMessage() {
  const fields = [
    {
      name: "Premium Benefits",
      value: 
        `> ${emojis.check} **Priority Support** - Get help faster\n` +
        `> ${emojis.check} **Custom Commands** - Create your own commands\n` +
        `> ${emojis.check} **Advanced Moderation** - Extended auto-mod features\n` +
        `> ${emojis.check} **Custom Embeds** - Personalized embed colors\n` +
        `> ${emojis.check} **No Cooldowns** - Skip command cooldowns\n` +
        `> ${emojis.check} **Exclusive Modules** - Access to premium-only features\n` +
        `> ${emojis.check} **Badge Recognition** - Premium badge on profile`,
      inline: false
    },
    {
      name: "Pricing",
      value: 
        `> **Monthly:** $4.99/month\n` +
        `> **Yearly:** $49.99/year (Save 17%)\n` +
        `> **Lifetime:** $99.99 (One-time payment)`,
      inline: false
    }
  ];

  const payload = ContainerBuilder.quickMessage(
    `${emojis.premium} Premium Features`,
    "*Unlock exclusive features and benefits*",
    fields,
    0xFFFFFF
  );

  const buttons = [];
  buttons.push(
    new ButtonBuilder()
      .setLabel("Get Premium")
      .setEmoji(emojis.premium)
      .setURL("https://discord.gg/premium")
      .setStyle(ButtonStyle.Link)
  );

  if (SUPPORT_SERVER) {
    buttons.push(
      new ButtonBuilder()
        .setLabel("Contact Support")
        .setEmoji(emojis.support)
        .setURL(SUPPORT_SERVER)
        .setStyle(ButtonStyle.Link)
    );
  }

  if (buttons.length > 0) {
    const row = new ActionRowBuilder().addComponents(...buttons);
    payload.components.push(row.toJSON());
  }

  return payload;
}
