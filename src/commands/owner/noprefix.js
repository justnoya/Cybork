
const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const { EMBED_COLORS } = require("@root/config");
const { getBotConfig } = require("@schemas/BotConfig");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "noprefix",
  description: "Manage users who can use commands without prefix (global)",
  category: "OWNER",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    aliases: ["toggleprefix"],
    usage: "<add|remove|list> [@user|user_id]",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: false,
    options: [
      {
        name: "add",
        description: "Add a user to global no-prefix whitelist",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "user",
            description: "The user to add",
            type: ApplicationCommandOptionType.User,
            required: true,
          },
        ],
      },
      {
        name: "remove",
        description: "Remove a user from global no-prefix whitelist",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "user",
            description: "The user to remove",
            type: ApplicationCommandOptionType.User,
            required: true,
          },
        ],
      },
      {
        name: "list",
        description: "List all users in global no-prefix whitelist",
        type: ApplicationCommandOptionType.Subcommand,
      },
    ],
  },

  async messageRun(message, args) {
    const config = await getBotConfig();
    const sub = args[0].toLowerCase();

    if (sub === "add") {
      const target = message.mentions.users.first() || message.client.users.cache.get(args[1]);
      if (!target) {
        try {
          const fetchedUser = await message.client.users.fetch(args[1]).catch(() => null);
          if (fetchedUser) {
            const response = await addUser(config, fetchedUser.id, fetchedUser.tag);
            return message.safeReply(response);
          }
        } catch (err) {}
        return message.safeReply("Please provide a valid user mention or user ID");
      }
      const response = await addUser(config, target.id, target.tag);
      return message.safeReply(response);
    }

    if (sub === "remove") {
      const target = message.mentions.users.first() || message.client.users.cache.get(args[1]);
      if (!target) {
        const response = await removeUser(config, args[1], args[1]);
        return message.safeReply(response);
      }
      const response = await removeUser(config, target.id, target.tag);
      return message.safeReply(response);
    }

    if (sub === "list") {
      const response = await listUsers(config, message.client);
      return message.safeReply(response);
    }

    return message.safeReply("Invalid subcommand. Use `add`, `remove`, or `list`");
  },

  async interactionRun(interaction) {
    const config = await getBotConfig();
    const sub = interaction.options.getSubcommand();

    if (sub === "add") {
      const user = interaction.options.getUser("user");
      const response = await addUser(config, user.id, user.tag);
      return interaction.followUp(response);
    }

    if (sub === "remove") {
      const user = interaction.options.getUser("user");
      const response = await removeUser(config, user.id, user.tag);
      return interaction.followUp(response);
    }

    if (sub === "list") {
      const response = await listUsers(config, interaction.client);
      return interaction.followUp(response);
    }
  },
};

async function addUser(config, userId, userTag) {
  if (!config.noprefix_users) config.noprefix_users = [];
  
  if (config.noprefix_users.includes(userId)) {
    return `${userTag} is already in the global no-prefix whitelist!`;
  }

  config.noprefix_users.push(userId);
  await config.save();
  return `✅ Successfully added ${userTag} to the **global** no-prefix whitelist!\n*This user can now use commands without prefix in all servers.*`;
}

async function removeUser(config, userId, userTag) {
  if (!config.noprefix_users || !config.noprefix_users.includes(userId)) {
    return `${userTag} is not in the global no-prefix whitelist!`;
  }

  config.noprefix_users = config.noprefix_users.filter(id => id !== userId);
  await config.save();
  return `✅ Successfully removed ${userTag} from the **global** no-prefix whitelist!`;
}

async function listUsers(config, client) {
  if (!config.noprefix_users || config.noprefix_users.length === 0) {
    return "No users in the global no-prefix whitelist!";
  }

  const userList = [];
  for (let i = 0; i < config.noprefix_users.length; i++) {
    const userId = config.noprefix_users[i];
    try {
      const user = client.users.cache.get(userId) || await client.users.fetch(userId).catch(() => null);
      userList.push(`${i + 1}. ${user ? user.tag : `Unknown User (${userId})`}`);
    } catch (err) {
      userList.push(`${i + 1}. Unknown User (${userId})`);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle("🌐 Global No-Prefix Whitelist")
    .setColor(EMBED_COLORS.BOT_EMBED)
    .setDescription(userList.join("\n"))
    .setFooter({ text: `Total: ${config.noprefix_users.length} user(s)` });

  return { embeds: [embed] };
}
