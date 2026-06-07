const { ApplicationCommandOptionType, ChannelType } = require("discord.js");
const { vMuteTarget, vUnmuteTarget, deafenTarget, unDeafenTarget, disconnectTarget, moveTarget } = require("@helpers/ModUtils");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "voice",
  description: "voice moderation commands",
  category: "MODERATION",
  userPermissions: ["MuteMembers", "MoveMembers", "DeafenMembers"],
  botPermissions: ["MuteMembers", "MoveMembers", "DeafenMembers"],
  command: {
    enabled: false,
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "mute",
        description: "mute a member's voice",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          { name: "user", description: "the target member", type: ApplicationCommandOptionType.User, required: true },
          { name: "reason", description: "reason for mute", type: ApplicationCommandOptionType.String, required: false },
        ],
      },
      {
        name: "unmute",
        description: "unmute a muted member's voice",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          { name: "user", description: "the target member", type: ApplicationCommandOptionType.User, required: true },
          { name: "reason", description: "reason for unmute", type: ApplicationCommandOptionType.String, required: false },
        ],
      },
      {
        name: "deafen",
        description: "deafen a member in voice channel",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          { name: "user", description: "the target member", type: ApplicationCommandOptionType.User, required: true },
          { name: "reason", description: "reason for deafen", type: ApplicationCommandOptionType.String, required: false },
        ],
      },
      {
        name: "undeafen",
        description: "undeafen a member in voice channel",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          { name: "user", description: "the target member", type: ApplicationCommandOptionType.User, required: true },
          { name: "reason", description: "reason for undeafen", type: ApplicationCommandOptionType.String, required: false },
        ],
      },
      {
        name: "kick",
        description: "kick a member from voice channel",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          { name: "user", description: "the target member", type: ApplicationCommandOptionType.User, required: true },
          { name: "reason", description: "reason for kick", type: ApplicationCommandOptionType.String, required: false },
        ],
      },
      {
        name: "move",
        description: "move a member to another voice channel",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          { name: "user", description: "the target member", type: ApplicationCommandOptionType.User, required: true },
          {
            name: "channel",
            description: "the channel to move member to",
            type: ApplicationCommandOptionType.Channel,
            channelTypes: [ChannelType.GuildVoice, ChannelType.GuildStageVoice],
            required: true,
          },
          { name: "reason", description: "reason for move", type: ApplicationCommandOptionType.String, required: false },
        ],
      },
    ],
  },

  async interactionRun(interaction) {
    const sub = interaction.options.getSubcommand();
    const reason = interaction.options.getString("reason");
    const user = interaction.options.getUser("user");
    const target = await interaction.guild.members.fetch(user.id);

    let result;

    if (sub === "mute") result = await vMuteTarget(interaction.member, target, reason);
    else if (sub === "unmute") result = await vUnmuteTarget(interaction.member, target, reason);
    else if (sub === "deafen") result = await deafenTarget(interaction.member, target, reason);
    else if (sub === "undeafen") result = await unDeafenTarget(interaction.member, target, reason);
    else if (sub === "kick") result = await disconnectTarget(interaction.member, target, reason);
    else if (sub === "move") {
      const channel = interaction.options.getChannel("channel");
      result = await moveTarget(interaction.member, target, reason, channel);
    }

    const successMessages = {
      mute: `${target.user.username}'s voice is muted`,
      unmute: `${target.user.username}'s voice is unmuted`,
      deafen: `${target.user.username} is deafened`,
      undeafen: `${target.user.username} is undeafened`,
      kick: `${target.user.username} disconnected from voice`,
      move: `${target.user.username} moved successfully`,
    };

    const errorMessages = {
      MEMBER_PERM: `You do not have permission to do that`,
      BOT_PERM: `I do not have permission to do that`,
      NO_VOICE: `${target.user.username} is not in any voice channel`,
      ALREADY_MUTED: `${target.user.username} is already voice muted`,
      NOT_MUTED: `${target.user.username} is not voice muted`,
      ALREADY_DEAFENED: `${target.user.username} is already deafened`,
      NOT_DEAFENED: `${target.user.username} is not deafened`,
      TARGET_PERM: `${target.user.username} doesn't have permission to join that channel`,
      ALREADY_IN_CHANNEL: `${target.user.username} is already in that channel`,
    };

    const msg =
      typeof result === "boolean"
        ? successMessages[sub] || "Done"
        : errorMessages[result] || `Failed to ${sub} ${target.user.username}`;

    await interaction.followUp(msg);
  },
};
