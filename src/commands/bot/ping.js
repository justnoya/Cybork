const ContainerBuilder = require("@helpers/ContainerBuilder");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "ping",
  description: "Shows the current latency from the bot to Discord servers",
  category: "BOT",
  command: {
    enabled: true,
    aliases: ["pong", "latency"],
  },
  slashCommand: {
    enabled: true,
    ephemeral: true,
    options: [],
  },

  async messageRun(message, args) {
    const ping = Math.floor(message.client.ws.ping);
    const status = ping < 100 ? 'Excellent' : ping < 200 ? 'Good' : 'Poor';

    const response = ContainerBuilder.quickMessage(
      "🏓 Pong",
      `Latency measurements for ${message.client.user.username}`,
      [
        { name: "Bot Latency", value: `\`${ping}ms\``, inline: true },
        { name: "API Latency", value: `\`${ping}ms\` - ${status}`, inline: true }
      ],
      0xFFFFFF
    );

    await message.channel.send(response);
  },

  async interactionRun(interaction) {
    const ping = Math.floor(interaction.client.ws.ping);
    const status = ping < 100 ? 'Excellent' : ping < 200 ? 'Good' : 'Poor';

    const response = ContainerBuilder.quickMessage(
      "🏓 Pong",
      `Latency measurements for ${interaction.client.user.username}`,
      [
        { name: "Bot Latency", value: `\`${ping}ms\``, inline: true },
        { name: "API Latency", value: `\`${ping}ms\` - ${status}`, inline: true }
      ],
      0xFFFFFF
    );

    await interaction.followUp(response);
  },
};