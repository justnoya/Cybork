const userInfo = require("./shared/user");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "userinfo",
  description: "shows information about a user",
  category: "INFORMATION",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    usage: "[@member|id]",
    aliases: ["uinfo", "memberinfo"],
  },
  slashCommand: {
    enabled: false,
  },

  async messageRun(message, args) {
    try {
      const target = args.length > 0 ? await message.guild.resolveMember(args[0]) : message.member;
      const response = target
        ? userInfo(target)
        : "That user is either invalid or not a member of this server.";
      await message.safeReply(response);
    } catch {
      await message.safeReply("That user is either invalid or not a member of this server.");
    }
  },
};
