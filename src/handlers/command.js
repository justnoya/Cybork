const { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } = require("discord.js");
const { OWNER_IDS, PREFIX_COMMANDS, EMBED_COLORS } = require("@root/config");
const { parsePermissions } = require("@helpers/Utils");
const { timeformat } = require("@helpers/Utils");
const { getSettings } = require("@schemas/Guild");
const { getBotConfig } = require("@schemas/BotConfig");

const cooldownCache = new Map();

module.exports = {
  /**
   * @param {import('discord.js').Message} message
   * @param {import("@structures/Command")} cmd
   * @param {object} settings
   */
  handlePrefixCommand: async function (message, cmd, settings) {
    const prefix = settings.prefix;
    let args;
    let invoke;
    
    // Check if message starts with prefix or is no-prefix
    if (message.content.startsWith(prefix)) {
      args = message.content.replace(prefix, "").split(/\s+/);
      invoke = args.shift().toLowerCase();
    } else {
      // No-prefix command
      args = message.content.split(/\s+/);
      invoke = args.shift().toLowerCase();
    }

    const data = {};
    data.settings = settings;
    data.prefix = prefix;
    data.invoke = invoke;

    if (!message.channel.permissionsFor(message.guild.members.me).has(PermissionFlagsBits.SendMessages)) return;

    // callback validations
    if (cmd.validations) {
      for (const validation of cmd.validations) {
        if (!validation.callback(message)) {
          return message.safeReply(validation.message);
        }
      }
    }

    // Owner commands - check both owners and global access users
    if (cmd.category === "OWNER") {
      const botConfig = await getBotConfig();
      const hasGlobalAccess = botConfig.access_users && botConfig.access_users.includes(message.author.id);
      if (!OWNER_IDS.includes(message.author.id) && !hasGlobalAccess) {
        return;
      }
    }

    // check user permissions
    if (cmd.userPermissions && cmd.userPermissions?.length > 0) {
      if (!message.channel.permissionsFor(message.member).has(cmd.userPermissions)) {
        return message.safeReply(`❌ You need ${parsePermissions(cmd.userPermissions)} for this command`);
      }
    }

    // check bot permissions
    if (cmd.botPermissions && cmd.botPermissions.length > 0) {
      if (!message.channel.permissionsFor(message.guild.members.me).has(cmd.botPermissions)) {
        return message.safeReply(`⚠️ I need ${parsePermissions(cmd.botPermissions)} for this command`);
      }
    }

    // minArgs count
    if (cmd.command.minArgsCount > args.length) {
      const usageEmbed = this.getCommandUsage(cmd, prefix, invoke);
      return message.safeReply({ embeds: [usageEmbed] });
    }

    // cooldown check
    if (cmd.cooldown > 0) {
      const remaining = getRemainingCooldown(message.author.id, cmd);
      if (remaining > 0) {
        return message.safeReply(`⏳ You are on cooldown. Please wait \`${timeformat(remaining)}\``);
      }
    }

    try {
      await cmd.messageRun(message, args, data);
    } catch (ex) {
      message.client.logger.error(`messageRun [${cmd.name}]`, ex);
      message.safeReply("An error occurred while running this command");
    } finally {
      if (cmd.cooldown > 0) applyCooldown(message.author.id, cmd);
    }
  },

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  handleSlashCommand: async function (interaction) {
    const cmd = interaction.client.slashCommands.get(interaction.commandName);
    if (!cmd) return interaction.reply({ content: "An error has occurred", ephemeral: true }).catch(() => {});

    // callback validations
    if (cmd.validations) {
      for (const validation of cmd.validations) {
        if (!validation.callback(interaction)) {
          return interaction.reply({
            content: validation.message,
            ephemeral: true,
          });
        }
      }
    }

    // Owner commands - check both owners and global access users
    if (cmd.category === "OWNER") {
      const botConfig = await getBotConfig();
      const hasGlobalAccess = botConfig.access_users && botConfig.access_users.includes(interaction.user.id);
      if (!OWNER_IDS.includes(interaction.user.id) && !hasGlobalAccess) {
        return;
      }
    }

    // user permissions
    if (interaction.member && cmd.userPermissions?.length > 0) {
      if (!interaction.member.permissions.has(cmd.userPermissions)) {
        return interaction.reply({
          content: `❌ You need ${parsePermissions(cmd.userPermissions)} for this command`,
          ephemeral: true,
        });
      }
    }

    // bot permissions
    if (cmd.botPermissions && cmd.botPermissions.length > 0) {
      if (!interaction.guild.members.me.permissions.has(cmd.botPermissions)) {
        return interaction.reply({
          content: `⚠️ I need ${parsePermissions(cmd.botPermissions)} for this command`,
          ephemeral: true,
        });
      }
    }

    // cooldown check
    if (cmd.cooldown > 0) {
      const remaining = getRemainingCooldown(interaction.user.id, cmd);
      if (remaining > 0) {
        return interaction.reply({
          content: `⏳ You are on cooldown. Please wait \`${timeformat(remaining)}\``,
          ephemeral: true,
        });
      }
    }

    try {
      await interaction.deferReply({ ephemeral: cmd.slashCommand.ephemeral });
      const settings = await getSettings(interaction.guild);
      await cmd.interactionRun(interaction, { settings });
    } catch (ex) {
      await interaction.followUp("Oops! An error occurred while running the command");
      interaction.client.logger.error(`interactionRun [${cmd.name}]`, ex);
    } finally {
      if (cmd.cooldown > 0) applyCooldown(interaction.user.id, cmd);
    }
  },

  /**
   * Build a usage embed for this command
   * @param {import('@structures/Command')} cmd - command object
   * @param {string} prefix - guild bot prefix
   * @param {string} invoke - alias that was used to trigger this command
   * @param {string} [title] - the embed title
   */
  getCommandUsage(cmd, prefix = PREFIX_COMMANDS.DEFAULT_PREFIX, invoke, title = "Usage") {
    let desc = "";
    if (cmd.command.subcommands && cmd.command.subcommands.length > 0) {
      cmd.command.subcommands.forEach((sub) => {
        desc += `\`${prefix}${invoke || cmd.name} ${sub.trigger}\`\n❯ ${sub.description}\n\n`;
      });
      if (cmd.command.aliases && cmd.command.aliases.length > 0) {
        desc += `**Aliases:** ${cmd.command.aliases.map(a => `\`${a}\``).join(", ")}\n`;
      }
      if (cmd.cooldown) {
        desc += `**Cooldown:** ${timeformat(cmd.cooldown)}`;
      }
    } else {
      desc += `\`\`\`ansi\n\u001b[1;37mUsage:\u001b[0m \u001b[0;36m${prefix}${invoke || cmd.name} ${cmd.command.usage}\u001b[0m\n\`\`\``;
      if (cmd.description !== "") desc += `\n**Info:** ${cmd.description}`;
      if (cmd.command.aliases && cmd.command.aliases.length > 0) {
        desc += `\n**Aliases:** ${cmd.command.aliases.map(a => `\`${a}\``).join(", ")}`;
      }
      if (cmd.cooldown) desc += `\n**Cooldown:** ${timeformat(cmd.cooldown)}`;
    }

    const embed = new EmbedBuilder().setColor(EMBED_COLORS.BOT_EMBED).setDescription(desc);
    if (title) embed.setAuthor({ name: title });
    return embed;
  },

  /**
   * @param {import('@structures/Command')} cmd - command object
   */
  getSlashUsage(cmd) {
    let desc = "";
    if (cmd.slashCommand.options?.find((o) => o.type === ApplicationCommandOptionType.Subcommand)) {
      const subCmds = cmd.slashCommand.options.filter((opt) => opt.type === ApplicationCommandOptionType.Subcommand);
      subCmds.forEach((sub) => {
        desc += `\`/${cmd.name} ${sub.name}\`\n❯ ${sub.description}\n\n`;
      });
    } else {
      desc += `\`/${cmd.name}\`\n\n**Help:** ${cmd.description}`;
    }

    if (cmd.cooldown) {
      desc += `\n**Cooldown:** ${timeformat(cmd.cooldown)}`;
    }

    return new EmbedBuilder().setColor(EMBED_COLORS.BOT_EMBED).setDescription(desc);
  },
};

/**
 * @param {string} memberId
 * @param {object} cmd
 */
function applyCooldown(memberId, cmd) {
  const key = cmd.name + "|" + memberId;
  cooldownCache.set(key, Date.now());
}

/**
 * @param {string} memberId
 * @param {object} cmd
 */
function getRemainingCooldown(memberId, cmd) {
  const key = cmd.name + "|" + memberId;
  if (cooldownCache.has(key)) {
    const remaining = (Date.now() - cooldownCache.get(key)) * 0.001;
    if (remaining > cmd.cooldown) {
      cooldownCache.delete(key);
      return 0;
    }
    return cmd.cooldown - remaining;
  }
  return 0;
}
