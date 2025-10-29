const { ApplicationCommandOptionType } = require("discord.js");
const ModernEmbed = require("@helpers/ModernEmbed");

const MUTE_ROLE_NAME = "Muted";

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "unmute",
  description: "Unmute a member to allow them to send messages again",
  category: "MODERATION",
  botPermissions: ["ManageRoles"],
  userPermissions: ["ModerateMembers"],
  command: {
    enabled: true,
    aliases: ["unsilence"],
    usage: "<@member|ID> [reason]",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: false,
    options: [
      {
        name: "user",
        description: "The member to unmute",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "reason",
        description: "Reason for unmuting",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },

  async messageRun(message, args) {
    const target = await message.guild.resolveMember(args[0], true);
    if (!target) {
      return message.safeReply(ModernEmbed.simpleError(`No member found matching ${args[0]}`));
    }

    const reason = message.content.split(args[0])[1]?.trim() || "No reason provided";
    const response = await unmuteMember(message.guild, message.member, target, reason);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const user = interaction.options.getUser("user");
    const target = await interaction.guild.members.fetch(user.id);
    const reason = interaction.options.getString("reason") || "No reason provided";

    const response = await unmuteMember(interaction.guild, interaction.member, target, reason);
    await interaction.followUp(response);
  },
};

/**
 * Unmute a member by removing the mute role
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').GuildMember} moderator
 * @param {import('discord.js').GuildMember} target
 * @param {string} reason
 */
async function unmuteMember(guild, moderator, target, reason) {
  const muteRole = guild.roles.cache.find(role => role.name === MUTE_ROLE_NAME);

  if (!muteRole) {
    return ModernEmbed.simpleError(
      `No mute role found. The mute role "${MUTE_ROLE_NAME}" does not exist in this server.`
    );
  }

  if (!target.roles.cache.has(muteRole.id)) {
    return ModernEmbed.simpleWarning(
      `${target.user.username} is not muted!`,
      "This member is not currently muted."
    );
  }

  try {
    await target.roles.remove(muteRole, `Unmuted by ${moderator.user.tag} | ${reason}`);

    await target.send({
      embeds: [
        ModernEmbed.createEmbed()
          .setHeader(`🔊 You have been unmuted in ${guild.name}`)
          .addField("Reason", reason)
          .addField("Moderator", moderator.user.tag)
          .setColor(0x51CF66)
          .setTimestamp()
          .build().embeds[0]
      ],
    }).catch(() => {});

    return ModernEmbed.success(
      "🔊 Member Unmuted",
      `**${target.user.username}** has been unmuted.\n**Reason:** ${reason}`,
      `Unmuted by ${moderator.user.username}`
    );
  } catch (error) {
    console.error("Unmute error:", error);
    return ModernEmbed.simpleError(
      `Failed to unmute ${target.user.username}. Please check my permissions and role hierarchy.`
    );
  }
}
