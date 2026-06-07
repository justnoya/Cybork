const { ChannelType } = require("discord.js");
const { moveTarget } = require("@helpers/ModUtils");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "move",
  description: "move specified member to a voice channel",
  category: "MODERATION",
  userPermissions: ["MoveMembers"],
  botPermissions: ["MoveMembers"],
  command: {
    enabled: true,
    usage: "<ID|@member> <channel> [reason]",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: false,
  },

  async messageRun(message, args) {
    const target = await message.guild.resolveMember(args[0], true);
    if (!target) return message.safeReply(`No user found matching ${args[0]}`);

    const channels = message.guild.findMatchingVoiceChannels(args[1]);
    if (!channels.length) return message.safeReply("No matching channels found");
    const targetChannel = channels.pop();
    if (targetChannel.type !== ChannelType.GuildVoice && targetChannel.type !== ChannelType.GuildStageVoice) {
      return message.safeReply("Target channel is not a voice channel");
    }

    const reason = args.slice(2).join(" ");
    const response = await moveTarget(message.member, target, reason, targetChannel);
    if (typeof response === "boolean") return message.safeReply(`${target.user.username} was successfully moved to: ${targetChannel}`);
    if (response === "MEMBER_PERM") return message.safeReply(`You do not have permission to move ${target.user.username}`);
    if (response === "BOT_PERM") return message.safeReply(`I do not have permission to move ${target.user.username}`);
    if (response === "NO_VOICE") return message.safeReply(`${target.user.username} is not in any voice channel`);
    if (response === "TARGET_PERM") return message.safeReply(`${target.user.username} doesn't have permission to join ${targetChannel}`);
    if (response === "ALREADY_IN_CHANNEL") return message.safeReply(`${target.user.username} is already connected to ${targetChannel}`);
    return message.safeReply(`Failed to move ${target.user.username} to ${targetChannel}`);
  },
};
