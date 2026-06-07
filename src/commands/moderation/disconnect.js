const { disconnectTarget } = require("@helpers/ModUtils");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "disconnect",
  description: "disconnect specified member from voice channel",
  category: "MODERATION",
  userPermissions: ["MuteMembers"],
  command: {
    enabled: true,
    usage: "<ID|@member> [reason]",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: false,
  },

  async messageRun(message, args) {
    const target = await message.guild.resolveMember(args[0], true);
    if (!target) return message.safeReply(`No user found matching ${args[0]}`);
    const reason = message.content.split(args[0])[1].trim();

    const response = await disconnectTarget(message.member, target, reason);
    if (typeof response === "boolean") return message.safeReply(`${target.user.username} is disconnected from the voice channel`);
    if (response === "MEMBER_PERM") return message.safeReply(`You do not have permission to disconnect ${target.user.username}`);
    if (response === "BOT_PERM") return message.safeReply(`I do not have permission to disconnect ${target.user.username}`);
    if (response === "NO_VOICE") return message.safeReply(`${target.user.username} is not in any voice channel`);
    return message.safeReply(`Failed to disconnect ${target.user.username}`);
  },
};
