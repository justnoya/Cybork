const avatarInfo = require("./shared/avatar");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "avatar",
  description: "shows a user's avatar",
  category: "INFORMATION",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    usage: "[@member|id]",
    aliases: ["av", "profilepic"],
  },
  slashCommand: {
    enabled: false,
  },

  async messageRun(message, args) {
    const target = (await message.guild.resolveMember(args[0])) || message.member;
    const response = avatarInfo(target.user);
    await message.safeReply(response);
  },
};
