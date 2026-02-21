const { CommandCategory, BotClient } = require("@src/structures");
const { SUPPORT_SERVER, OWNER_IDS, DEVELOPER } = require("@root/config.js");
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  Message,
  ButtonBuilder,
  CommandInteraction,
  ApplicationCommandOptionType,
  ButtonStyle,
} = require("discord.js");
const { getCommandUsage, getSlashUsage } = require("@handlers/command");
const emojis = require("@root/emojis.json");
const mongoose = require("mongoose");
const GuildModel = mongoose.model("guild");

const IDLE_TIMEOUT = 120;

module.exports = {
  name: "help",
  description: "Interactive help menu with all commands",
  category: "UTILITY",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    aliases: ["h", "commands"],
    usage: "[command]",
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "command",
        description: "name of the command",
        required: false,
        type: ApplicationCommandOptionType.String,
      },
    ],
  },

  async messageRun(message, args, data) {
    let trigger = args[0];

    if (!trigger) {
      const response = await getHelpMenu(message, data.prefix);
      const sentMsg = await message.channel.send(response);
      return waiter(sentMsg, message.author.id, data.prefix);
    }

    const cmd = message.client.getCommand(trigger);
    if (cmd) {
      const embed = getCommandUsage(cmd, data.prefix, trigger);
      return message.channel.send({ embeds: [embed] });
    }

    const direction = trigger?.toUpperCase();
    if (Object.prototype.hasOwnProperty.call(CommandCategory, direction)) {
      // Hide OWNER category from non-owners
      if (direction === 'OWNER' && !OWNER_IDS.includes(message.author.id)) {
        return message.channel.send(`${emojis.error} No command or category found matching your input`);
      }

      const categoryResponse = getCategoryEmbed(message.client, direction, data.prefix, 0);
      const sentMsg = await message.channel.send(categoryResponse);
      return waiter(sentMsg, message.author.id, data.prefix, direction, 0);
    }

    await message.channel.send(`${emojis.error} No command or category found matching your input`);
  },

  async interactionRun(interaction) {
    let cmdName = interaction.options.getString("command");

    if (!cmdName) {
      const response = await getHelpMenu(interaction);
      const sentMsg = await interaction.followUp(response);
      return waiter(sentMsg, interaction.user.id);
    }

    const cmd = interaction.client.slashCommands.get(cmdName);
    if (cmd) {
      const embed = getSlashUsage(cmd);
      return interaction.followUp({ embeds: [embed] });
    }

    await interaction.followUp(`${emojis.error} No matching command found`);
  },
};

async function getHelpMenu(context, prefix) {
  const { client, guild, author, user } = context;
  const displayUser = author || user;
  const isOwner = OWNER_IDS.includes(displayUser?.id);

  // Define category order: Owner first (if owner), then specific order
  const categoryOrder = [
    'OWNER',
    'ANTINUKE',
    'AUTOMOD',
    'MUSIC',
    'MODERATION',
    'INFORMATION',
    'GIVEAWAY',
    'TICKET',
    'UTILITY',
    'GATEWAY',
    'PROFILE',
    'LEADERBOARD',
    'SUGGESTION',
    'BOT',
    'LOGS'
  ];

  const categoryMapping = {
    'OWNER': { name: 'Owner' },
    'ANTINUKE': { name: 'Antinuke' },
    'AUTOMOD': { name: 'Automod' },
    'MUSIC': { name: 'Music' },
    'MODERATION': { name: 'Moderation' },
    'INFORMATION': { name: 'Information' },
    'GIVEAWAY': { name: 'Giveaway' },
    'TICKET': { name: 'Ticket' },
    'UTILITY': { name: 'Utility' },
    'GATEWAY': { name: 'Gateway' },
    'PROFILE': { name: 'Profile' },
    'LEADERBOARD': { name: 'Leaderboard' },
    'SUGGESTION': { name: 'Suggestions' },
    'BOT': { name: 'Bot' },
    'LOGS': { name: 'Logs' },
  };

  const prefixText = prefix || '!';
  const ContainerBuilder = require("@helpers/ContainerBuilder");

  // Get developers from global settings
  const globalSettings = await GuildModel.findOne({ _id: "GLOBAL_SETTINGS" });
  const developers = globalSettings?.developers || [];

  // Build developer list
  const ownerId = OWNER_IDS[0];
  let developerText = `**[Falooda](https://discord.com/users/${ownerId})**`;
  if (developers.length > 0) {
    const devNames = [];
    for (const devId of developers) {
      try {
        const user = await client.users.fetch(devId);
        devNames.push(user.username);
      } catch (err) {
        // Skip if user can't be fetched
      }
    }
    if (devNames.length > 0) {
      developerText = `**[Falooda](https://discord.com/users/${ownerId})**, ${devNames.join(', ')}`;
    }
  }

  const mainText = ContainerBuilder.createTextDisplay(
    `# ${client?.user?.username || 'Bot'} Command Catalog\n\n` +
    `**Welcome to the Hub**\n` +
    `Explore my capabilities by selecting a category from the dropdown menu below. Each module contains a specialized set of tools designed to enhance your server experience.\n\n` +
    `**Quick Tips**\n` +
    `• Use \`${prefixText}help <command>\` for deep-dive technical specs.\n` +
    `• Encountered a glitch? Run \`${prefixText}reportbug\` to alert the engineering team.\n\n` +
    `**Resource Center**\n` +
    `• **[Join the Community](${SUPPORT_SERVER})** for live support and updates.\n\n` +
    `Developed with 🤍 by **${developerText}**`
  );

  // Categories to exclude from help dropdown (OWNER will be conditionally added)
  const excludedCategories = ['SUGGESTION', 'PROFILE', 'TICKET'];

  // Build menu options in specific order, filtering based on ownership
  const menuOptions = categoryOrder
    .filter(key => {
      const category = CommandCategory[key];
      if (!category) return false;
      if (category.enabled === false) return false;
      if (key === 'OWNER' && !isOwner) return false;
      if (excludedCategories.includes(key)) return false;
      return true;
    })
    .map(key => {
      const category = CommandCategory[key];
      const mapping = categoryMapping[key] || { name: category.name };
      return {
        label: mapping.name,
        value: key,
        description: `View commands in ${mapping.name} category`,
      };
    });

  const menuRow = ActionRowBuilder.from({
    type: 1,
    components: [{
      type: 3,
      custom_id: "help-menu",
      placeholder: `${client?.user?.username || 'Bot'} Command Modules`,
      options: menuOptions
    }]
  });

  const linkButtons = ActionRowBuilder.from({
    type: 1,
    components: [
      {
        type: 2,
        style: ButtonStyle.Link,
        label: "Invite Bot",
        url: client?.getInvite ? client.getInvite() : `https://discord.com/oauth2/authorize?client_id=${client?.user?.id}&permissions=8&scope=bot%20applications.commands`
      },
      SUPPORT_SERVER ? {
        type: 2,
        style: ButtonStyle.Link,
        label: "Support Server",
        url: SUPPORT_SERVER
      } : null
    ].filter(Boolean)
  });

  const payload = new ContainerBuilder()
    .addContainer({ 
      accentColor: 0xFFFFFF, 
      components: [mainText, menuRow, linkButtons]
    })
    .build();

  return payload;
}

const waiter = (msg, userId, prefix, initialCategory = null, initialPage = 0) => {
  const collector = msg.channel.createMessageComponentCollector({
    filter: (reactor) => reactor.user.id === userId && msg.id === reactor.message.id,
    idle: IDLE_TIMEOUT * 1000,
    dispose: true,
    time: 10 * 60 * 1000,
  });

  let currentComponents = msg.components;
  let currentPage = initialPage;
  let currentCategory = initialCategory;

  collector.on("collect", async (response) => {
    await response.deferUpdate();

    switch (response.customId) {
      case "home-btn": {
        const homeResponse = await getHelpMenu({ client: msg.client, guild: msg.guild, user: response.user }, prefix);
        currentComponents = homeResponse.components;
        currentPage = 0;
        currentCategory = null;
        msg.editable && (await msg.edit(homeResponse));
        break;
      }

      case "help-menu": {
        const cat = response.values[0].toUpperCase();
        currentCategory = cat;
        currentPage = 0;
        const categoryResponse = getCategoryEmbed(msg.client, cat, prefix, currentPage);
        currentComponents = categoryResponse.components || [];
        msg.editable && (await msg.edit(categoryResponse));
        break;
      }

      case "prev-btn": {
        if (currentCategory && currentPage > 0) {
          currentPage--;
          const categoryResponse = getCategoryEmbed(msg.client, currentCategory, prefix, currentPage);
          currentComponents = categoryResponse.components || [];
          msg.editable && (await msg.edit(categoryResponse));
        }
        break;
      }

      case "next-btn": {
        if (currentCategory) {
          const tempResponse = getCategoryEmbed(msg.client, currentCategory, prefix, currentPage + 1);
          if (currentPage < tempResponse.totalPages - 1) {
            currentPage++;
            const categoryResponse = getCategoryEmbed(msg.client, currentCategory, prefix, currentPage);
            currentComponents = categoryResponse.components || [];
            msg.editable && (await msg.edit(categoryResponse));
          }
        }
        break;
      }
    }
  });

  collector.on("end", () => {
    if (!msg.guild || !msg.channel) return;

    const disabledComponents = currentComponents.map(row => {
      const newRow = new ActionRowBuilder();
      const rowJson = typeof row.toJSON === 'function' ? row.toJSON() : row;
      rowJson.components.forEach(componentData => {
        if (componentData.type === 2 && componentData.style === 5) {
          newRow.addComponents(ButtonBuilder.from(componentData));
        } else if (componentData.type === 3) {
          newRow.addComponents(
            StringSelectMenuBuilder.from(componentData).setDisabled(true)
          );
        } else if (componentData.type === 2) {
          newRow.addComponents(
            ButtonBuilder.from(componentData).setDisabled(true)
          );
        }
      });
      return newRow;
    });

    return msg.editable && msg.edit({ components: disabledComponents });
  });
};

function getCategoryEmbed(client, category, prefix, page = 0) {
  const ContainerBuilder = require("@helpers/ContainerBuilder");
  const COMMANDS_PER_PAGE = 10;

  // Get both message and slash commands for the category
  let commands = Array.from(client.commands.values()).filter((cmd) => cmd.category === category);

  // Add additional moderation commands if category is MODERATION
  if (category === 'MODERATION') {
    const additionalModerationCommands = [
      { name: 'audit', description: 'View audit logs for moderation actions' },
      { name: 'ban', description: 'Ban a member from the server' },
      { name: 'delchannel', description: 'Delete a channel' },
      { name: 'giverole', description: 'Give a role to a member' },
      { name: 'hide', description: 'Hide a channel from members' },
      { name: 'hideall', description: 'Hide all channels from members' },
      { name: 'kick', description: 'Kick a member from the server' },
      { name: 'lock', description: 'Lock a channel' },
      { name: 'lockall', description: 'Lock all channels' },
      { name: 'mute', description: 'Mute a member' },
      { name: 'nick', description: 'Change a member\'s nickname' },
      { name: 'role', description: 'Manage roles for members' },
      { name: 'role all', description: 'Give role to all members' },
      { name: 'role bots', description: 'Give role to all bots' },
      { name: 'role cancel', description: 'Cancel ongoing role operation' },
      { name: 'role humans', description: 'Give role to all humans' },
      { name: 'role status', description: 'Check role operation status' },
      { name: 'rrole', description: 'Remove role from members' },
      { name: 'rrole bots', description: 'Remove role from all bots' },
      { name: 'rrole cancel', description: 'Cancel ongoing role removal operation' },
      { name: 'rrole humans', description: 'Remove role from all humans' },
      { name: 'rrole status', description: 'Check role removal operation status' },
      { name: 'temprole', description: 'Give temporary role to a member' },
      { name: 'temprole add', description: 'Add a temporary role' },
      { name: 'temprole info', description: 'View temporary role information' },
      { name: 'temprole list', description: 'List all temporary roles' },
      { name: 'temprole remove', description: 'Remove a temporary role' },
      { name: 'unban', description: 'Unban a member from the server' },
      { name: 'unbanall', description: 'Unban all banned members' },
      { name: 'unhide', description: 'Unhide a channel' },
      { name: 'unhideall', description: 'Unhide all channels' },
      { name: 'unlock', description: 'Unlock a channel' },
      { name: 'unlockall', description: 'Unlock all channels' },
      { name: 'unmute', description: 'Unmute a member' },
      { name: 'warn', description: 'Warn a member' },
      { name: 'warn clear', description: 'Clear warnings for a member' },
      { name: 'warn info', description: 'View warning information' },
    ];

    // Add additional commands that don't exist yet
    const existingCommandNames = new Set(commands.map(cmd => cmd.name));
    additionalModerationCommands.forEach(addCmd => {
      if (!existingCommandNames.has(addCmd.name)) {
        commands.push({
          name: addCmd.name,
          description: addCmd.description,
          category: 'MODERATION'
        });
      }
    });
  }

  const categoryMapping = {
    'OWNER': { name: 'Owner' },
    'ANTINUKE': { name: 'Antinuke' },
    'AUTOMOD': { name: 'Automod' },
    'MUSIC': { name: 'Music' },
    'MODERATION': { name: 'Moderation' },
    'INFORMATION': { name: 'Information' },
    'GIVEAWAY': { name: 'Giveaway' },
    'TICKET': { name: 'Ticket' },
    'UTILITY': { name: 'Utility' },
    'GATEWAY': { name: 'Gateway' },
    'PROFILE': { name: 'Profile' },
    'LEADERBOARD': { name: 'Leaderboard' },
    'SUGGESTION': { name: 'Suggestions' },
    'BOT': { name: 'Bot' },
    'LOGS': { name: 'Logs' },
  };

  const categoryInfo = CommandCategory[category];
  const mapping = categoryMapping[category] || { name: categoryInfo?.name };

  if (commands.length === 0) {
    const emptyText = ContainerBuilder.createTextDisplay(
      `## ${mapping.name} Module\n\nThis module is currently undergoing maintenance or has no active commands. Please check back later!\n\n` +
      `*Powered by ${client.config.DEVELOPER}*`
    );

    const payload = new ContainerBuilder()
      .addContainer({ 
        accentColor: 0xFFFFFF, 
        components: [emptyText]
      })
      .build();

    payload.totalPages = 1;
    return payload;
  }

  // Flatten all commands and subcommands
  const allCommandEntries = [];
  commands.forEach(cmd => {
    const cmdPrefix = prefix || '!';

    // Check for slash command subcommands first
    if (cmd.slashCommand?.enabled && cmd.slashCommand?.options) {
      const subcommands = cmd.slashCommand.options.filter(opt => opt.type === 1);
      if (subcommands.length > 0) {
        subcommands.forEach(sub => {
          allCommandEntries.push(`• \`${cmdPrefix}${cmd.name} ${sub.name}\` — ${sub.description}`);
        });
        return;
      }
    }

    // Check for message command subcommands
    if (cmd.command?.subcommands && cmd.command.subcommands.length > 0) {
      cmd.command.subcommands.forEach(sub => {
        const trigger = sub.trigger.split(' ')[0];
        allCommandEntries.push(`• \`${cmdPrefix}${cmd.name} ${trigger}\` — ${sub.description || 'No description'}`);
      });
      return;
    }

    // Single command
    allCommandEntries.push(`• \`${cmdPrefix}${cmd.name}\` — ${cmd.description}`);
  });

  // Calculate pagination
  const totalPages = Math.ceil(allCommandEntries.length / COMMANDS_PER_PAGE);
  const startIndex = page * COMMANDS_PER_PAGE;
  const endIndex = Math.min(startIndex + COMMANDS_PER_PAGE, allCommandEntries.length);
  const pageCommands = allCommandEntries.slice(startIndex, endIndex);

  const commandsList = pageCommands.join('\n');

  // Format header with page number in bold code block format
  const categoryName = `${mapping.name} Module`;
  const pageInfo = `**\`\`\`               (Page ${page + 1}/${totalPages})               \`\`\`**`;

  const categoryText = ContainerBuilder.createTextDisplay(
    `## ${categoryName}\n${pageInfo}\n\n` +
    `${commandsList}\n\n` +
    `*Run \`${prefix || '!'}help <command>\` for detailed syntax and usage rules.*\n\n` +
    `*Powered by ${client.config.DEVELOPER}*`
  );

  const navButtons = getNavigationButtons(totalPages, page);

  const payload = new ContainerBuilder()
    .addContainer({ 
      accentColor: 0xFFFFFF, 
      components: [categoryText, navButtons]
    })
    .build();

  payload.totalPages = totalPages;
  return payload;
}

function getBackButton() {
  return ActionRowBuilder.from({
    type: 1,
    components: [{
      type: 2,
      custom_id: "home-btn",
      label: "Back",
      style: ButtonStyle.Secondary
    }]
  });
}

function getNavigationButtons(totalPages, currentPage) {
  const components = [];

  // Previous button (disabled if on first page)
  components.push({
    type: 2,
    custom_id: "prev-btn",
    label: "Previous",
    style: ButtonStyle.Primary,
    disabled: currentPage === 0
  });

  // Back button (always enabled)
  components.push({
    type: 2,
    custom_id: "home-btn",
    label: "Back",
    style: ButtonStyle.Secondary
  });

  // Next button (disabled if on last page)
  components.push({
    type: 2,
    custom_id: "next-btn",
    label: "Next",
    style: ButtonStyle.Primary,
    disabled: currentPage >= totalPages - 1
  });

  return ActionRowBuilder.from({
    type: 1,
    components: components
  });
}