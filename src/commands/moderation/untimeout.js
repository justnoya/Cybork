const { unTimeoutTarget } = require("@helpers/ModUtils");
const { ApplicationCommandOptionType } = require("discord.js");
const ModernEmbed = require("@helpers/ModernEmbed");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "untimeout",
  description: "remove timeout from a member",
  category: "MODERATION",
  botPermissions: ["ModerateMembers"],
  userPermissions: ["ModerateMembers"],
  command: {
    enabled: true,
    aliases: [],
    usage: "<ID|@member> [reason]",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "user",
        description: "the target member",
        type: ApplicationCommandOptionType.User,
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
    const reason = args.slice(1).join(" ").trim();
    const response = await untimeout(message.member, target, reason);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason");
    const target = await interaction.guild.members.fetch(user.id);

    const response = await untimeout(interaction.member, target, reason);
    await interaction.followUp(response);
  },
};

async function untimeout(issuer, target, reason) {
  const response = await unTimeoutTarget(issuer, target, reason);

  const targetUsername = target.user?.username || target.username;

  if (typeof response === "boolean") {
    return ModernEmbed.success(
      "Timeout Removed",
      `Successfully removed timeout from **${targetUsername}**.\n**Reason:** ${reason || "No reason provided"}`,
      `Removed by ${issuer.user.username}`
    );
  }

  if (response === "BOT_PERM") {
    return ModernEmbed.simpleError(
      `I don't have permission to remove timeout from ${targetUsername}.`
    );
  }

  if (response === "MEMBER_PERM") {
    return ModernEmbed.simpleError(
      `You need to have a higher role than ${targetUsername} to execute this command!`
    );
  }

  if (response === "NO_TIMEOUT") {
    return ModernEmbed.simpleError(
      `**${targetUsername}** is not timed out!`
    );
  }

  return ModernEmbed.simpleError(
    `Failed to remove timeout from **${targetUsername}**. Please try again or contact an administrator.`
  );
}