const guildInfo = require("./shared/guild");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "guildinfo",
  description: "shows information about the server",
  category: "INFORMATION",
  botPermissions: ["EmbedLinks"],
  cooldown: 5,
  command: {
    enabled: true,
    aliases: ["serverinfo", "si", "server", "ginfo"],
  },
  slashCommand: {
    enabled: false,
  },

  async messageRun(message) {
    const response = await guildInfo(message.guild);
    await message.safeReply(response);
  },
};
