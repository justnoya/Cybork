const { ApplicationCommandOptionType, PermissionFlagsBits } = require("discord.js");
const ModernEmbed = require("@helpers/ModernEmbed");

const MUTE_ROLE_NAME = "Muted";

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "mute",
  description: "Mute a member to prevent them from sending messages",
  category: "MODERATION",
  botPermissions: ["ManageRoles", "ManageChannels"],
  userPermissions: ["ModerateMembers"],
  command: {
    enabled: false,
    aliases: ["silence"],
    usage: "<@member|ID> [reason]",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: false,
    options: [
      {
        name: "user",
        description: "The member to mute",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "reason",
        description: "Reason for muting",
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
    const response = await muteMember(message.guild, message.member, target, reason);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const user = interaction.options.getUser("user");
    const target = await interaction.guild.members.fetch(user.id);
    const reason = interaction.options.getString("reason") || "No reason provided";

    const response = await muteMember(interaction.guild, interaction.member, target, reason);
    await interaction.followUp(response);
  },
};

/**
 * Mute a member using role-based muting
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').GuildMember} moderator
 * @param {import('discord.js').GuildMember} target
 * @param {string} reason
 */
async function muteMember(guild, moderator, target, reason) {
  if (target.id === moderator.id) {
    return ModernEmbed.simpleError("You cannot mute yourself!");
  }

  if (target.id === guild.ownerId) {
    return ModernEmbed.simpleError("You cannot mute the server owner!");
  }

  if (target.roles.highest.position >= moderator.roles.highest.position && moderator.id !== guild.ownerId) {
    return ModernEmbed.simpleError(
      `You cannot mute ${target.user.username} because they have a higher or equal role than you!`
    );
  }

  const botMember = guild.members.me;
  if (target.roles.highest.position >= botMember.roles.highest.position) {
    return ModernEmbed.simpleError(
      `I cannot mute ${target.user.username} because they have a higher or equal role than me!`
    );
  }

  try {
    let muteRole = guild.roles.cache.find(role => role.name === MUTE_ROLE_NAME);

    if (!muteRole) {
      muteRole = await createMuteRole(guild);
      if (!muteRole) {
        return ModernEmbed.simpleError(
          "Failed to create mute role. Please ensure I have the Manage Roles permission."
        );
      }
    }

    if (target.roles.cache.has(muteRole.id)) {
      return ModernEmbed.simpleWarning(
        `${target.user.username} is already muted!`,
        "This member is already muted."
      );
    }

    await target.roles.add(muteRole, `Muted by ${moderator.user.tag} | ${reason}`);

    await target.send({
      embeds: [
        ModernEmbed.createEmbed()
          .setHeader(`🔇 You have been muted in ${guild.name}`)
          .addField("Reason", reason)
          .addField("Moderator", moderator.user.tag)
          .setColor(0xFF6B6B)
          .setTimestamp()
          .build().embeds[0]
      ],
    }).catch(() => {});

    return ModernEmbed.success(
      "🔇 Member Muted",
      `**${target.user.username}** has been muted.\n**Reason:** ${reason}`,
      `Muted by ${moderator.user.username}`
    );
  } catch (error) {
    console.error("Mute error:", error);
    return ModernEmbed.simpleError(
      `Failed to mute ${target.user.username}. Please check my permissions and role hierarchy.`
    );
  }
}

/**
 * Create and configure mute role
 * @param {import('discord.js').Guild} guild
 */
async function createMuteRole(guild) {
  try {
    const muteRole = await guild.roles.create({
      name: MUTE_ROLE_NAME,
      color: 0x808080,
      permissions: [],
      reason: "Mute role created by bot for moderation",
    });

    const channels = guild.channels.cache;
    let successCount = 0;
    let failCount = 0;

    for (const [, channel] of channels) {
      try {
        if (channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.ManageChannels)) {
          await channel.permissionOverwrites.create(muteRole, {
            SendMessages: false,
            AddReactions: false,
            Speak: false,
            Connect: false,
          }, {
            reason: "Setting up mute role permissions",
          });
          successCount++;
        }
      } catch (err) {
        failCount++;
        console.error(`Failed to set mute role permissions in ${channel.name}:`, err.message);
      }

      if ((successCount + failCount) % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Mute role created. Successfully configured ${successCount} channels, failed ${failCount}`);
    return muteRole;
  } catch (error) {
    console.error("Failed to create mute role:", error);
    return null;
  }
}
