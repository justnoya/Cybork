const { timeoutTarget } = require("@helpers/ModUtils");
const { ApplicationCommandOptionType } = require("discord.js");
const ems = require("enhanced-ms");
const ModernEmbed = require("@helpers/ModernEmbed");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "timeout",
  description: "timeouts the specified member",
  category: "MODERATION",
  botPermissions: ["ModerateMembers"],
  userPermissions: ["ModerateMembers"],
  command: {
    enabled: false,
    aliases: [],
    usage: "<ID|@member> <duration> [reason]",
    minArgsCount: 2,
  },
  slashCommand: {
    enabled: false,
    options: [
      {
        name: "user",
        description: "the target member",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "duration",
        description: "the time to timeout the member for",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "reason",
        description: "reason for timeout",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },

  async messageRun(message, args) {
    const target = await message.guild.resolveMember(args[0], true);
    if (!target) return message.safeReply(`No user found matching ${args[0]}`);

    // parse time
    const ms = ems(args[1]);
    if (!ms) return message.safeReply("Please provide a valid duration. Example: 1d/1h/1m/1s");

    const reason = args.slice(2).join(" ").trim() || "No reason provided";
    const response = await timeout(message.member, target, reason, ms);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const user = interaction.options.getUser("user");

    // parse time
    const duration = interaction.options.getString("duration");
    const ms = ems(duration);
    if (!ms) return interaction.followUp("Please provide a valid duration. Example: 1d/1h/1m/1s");

    const reason = interaction.options.getString("reason");
    const target = await interaction.guild.members.fetch(user.id);

    const response = await timeout(interaction.member, target, reason, ms);
    await interaction.followUp(response);
  },
};

async function timeout(issuer, target, reason, ms) {
  const response = await timeoutTarget(issuer, target, ms, reason);

  const targetUsername = target.user?.username || target.username;

  if (typeof response === "boolean") {
    return ModernEmbed.success(
      "Member Timed Out",
      `**${targetUsername}** has been timed out.\n**Reason:** ${reason || "No reason provided"}\n**Duration:** <t:${Math.round((Date.now() + ms) / 1000)}:R>`,
      `Timed out by ${issuer.user.username}`
    );
  }

  if (response === "BOT_PERM") {
    return ModernEmbed.simpleError(
      `I don't have permission to timeout ${targetUsername}. Please ensure I have a role higher than the target user.`
    );
  }

  if (response === "MEMBER_PERM") {
    return ModernEmbed.simpleError(
      `You need to have a higher role than ${targetUsername} to execute this command!`
    );
  }

  if (response === "ALREADY_TIMEOUT") {
    return ModernEmbed.simpleError(
      `**${targetUsername}** is already timed out!`
    );
  }

  return ModernEmbed.simpleError(
    `Failed to timeout **${targetUsername}**. Please try again or contact an administrator.`
  );
}