const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const { EMBED_COLORS, OWNER_IDS } = require("@root/config");
const { getBotConfig } = require("@schemas/BotConfig");
const EMOJIS = require("@helpers/EmojiConstants");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "access",
  description: "Manage bot access users globally (owner only)",
  category: "OWNER",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    aliases: ["bot"],
    usage: "<@user|user_id|list|reset> [remove]",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: false,
    options: [
      {
        name: "add",
        description: "Grant global bot access to a user",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "user",
            description: "The user to grant bot access",
            type: ApplicationCommandOptionType.User,
            required: true,
          },
        ],
      },
      {
        name: "remove",
        description: "Remove global bot access from a user",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "user",
            description: "The user to remove bot access from",
            type: ApplicationCommandOptionType.User,
            required: true,
          },
        ],
      },
      {
        name: "list",
        description: "List all users with global bot access",
        type: ApplicationCommandOptionType.Subcommand,
      },
    ],
  },

  async messageRun(message, args) {
    if (args[0].toLowerCase() === "list") {
      return await listAccessUsers(message);
    }

    if (args[0].toLowerCase() === "reset") {
      return await resetAllAccess(message);
    }

    const target = message.mentions.users.first() || message.client.users.cache.get(args[0]);
    let targetUser = target;
    
    if (!target) {
      try {
        targetUser = await message.client.users.fetch(args[0]).catch(() => null);
      } catch (err) {}
    }
    
    if (!targetUser) {
      return message.safeReply("Please provide a valid user mention, user ID, or use `list` to see all access users, or `reset` to remove all.");
    }

    const isRemove = args[1] && args[1].toLowerCase() === "remove";

    if (isRemove) {
      return await removeAccess(message, targetUser);
    } else {
      return await grantAccess(message, targetUser);
    }
  },

  async interactionRun(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "list") {
      return await listAccessUsers(interaction);
    } else if (sub === "add") {
      const target = interaction.options.getUser("user");
      return await grantAccess(interaction, target);
    } else if (sub === "remove") {
      const target = interaction.options.getUser("user");
      return await removeAccess(interaction, target);
    }
  },
};

async function grantAccess(context, target) {
  if (!target) {
    const content = "User not found.";
    return context.deferred ? context.followUp({ content, ephemeral: true }) : context.safeReply(content);
  }

  if (OWNER_IDS.includes(target.id)) {
    const content = `${EMOJIS.WARN} | ${target.tag} is already a bot owner!`;
    return context.deferred ? context.followUp({ content, ephemeral: true }) : context.safeReply(content);
  }

  const config = await getBotConfig();
  
  if (!config.access_users) config.access_users = [];
  
  if (config.access_users.includes(target.id)) {
    const content = `${EMOJIS.WARN} | ${target.tag} already has global bot access!`;
    return context.deferred ? context.followUp({ content, ephemeral: true }) : context.safeReply(content);
  }

  config.access_users.push(target.id);
  await config.save();

  const issuer = context.user || context.author;
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.SUCCESS)
    .setDescription(
      `${EMOJIS.SUCCESS} | **Global Bot Access Granted**\n\n` +
      `**User:** ${target.tag}\n` +
      `**Scope:** All servers\n` +
      `**Permissions:**\n` +
      `• Can use commands without prefix globally\n` +
      `• Full command access (except owner commands)\n` +
      `• All bot features enabled in every server`
    )
    .setTimestamp()
    .setFooter({ text: `Granted by ${issuer.tag}` });

  return context.deferred ? context.followUp({ embeds: [embed] }) : context.safeReply({ embeds: [embed] });
}

async function removeAccess(context, target) {
  if (!target) {
    const content = "User not found.";
    return context.deferred ? context.followUp({ content, ephemeral: true }) : context.safeReply(content);
  }

  const config = await getBotConfig();
  
  if (!config.access_users || !config.access_users.includes(target.id)) {
    const content = `${EMOJIS.WARN} | ${target.tag} doesn't have global bot access!`;
    return context.deferred ? context.followUp({ content, ephemeral: true }) : context.safeReply(content);
  }

  config.access_users = config.access_users.filter(id => id !== target.id);
  await config.save();

  const issuer = context.user || context.author;
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.WARNING)
    .setDescription(
      `${EMOJIS.SUCCESS} | **Global Bot Access Removed**\n\n` +
      `**User:** ${target.tag}\n` +
      `**Removed by:** ${issuer.tag}`
    )
    .setTimestamp();

  return context.deferred ? context.followUp({ embeds: [embed] }) : context.safeReply({ embeds: [embed] });
}

async function resetAllAccess(context) {
  const config = await getBotConfig();
  const removedCount = config.access_users ? config.access_users.length : 0;
  
  config.access_users = [];
  await config.save();

  const issuer = context.user || context.author;
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.WARNING)
    .setDescription(
      `${EMOJIS.SUCCESS} | **All Global Bot Access Reset**\n\n` +
      `**Removed:** ${removedCount} user(s)\n` +
      `**Reset by:** ${issuer.tag}`
    )
    .setTimestamp();

  return context.deferred ? context.followUp({ embeds: [embed] }) : context.safeReply({ embeds: [embed] });
}

async function listAccessUsers(context) {
  const config = await getBotConfig();
  const accessUsers = config.access_users || [];

  let description = `**🌐 Global Bot Access Users**\n\n`;
  
  if (accessUsers.length === 0) {
    description += `${EMOJIS.WARN} No users have global bot access yet.\n\n`;
  } else {
    description += `Total: ${accessUsers.length}\n\n`;
    for (let i = 0; i < accessUsers.length; i++) {
      const userId = accessUsers[i];
      description += `${i + 1}. <@${userId}> (\`${userId}\`)\n`;
    }
    description += `\n`;
  }

  description += `\n**Bot Owners:**\n`;
  OWNER_IDS.forEach((ownerId, index) => {
    description += `${index + 1}. <@${ownerId}> (\`${ownerId}\`) 👑\n`;
  });

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.BOT_EMBED)
    .setDescription(description)
    .setFooter({ text: "Global access works across all servers" })
    .setTimestamp();

  return context.deferred ? context.followUp({ embeds: [embed] }) : context.safeReply({ embeds: [embed] });
}
