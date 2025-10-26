const { ApplicationCommandOptionType } = require("discord.js");
const { getSettings } = require("@schemas/Guild");
const ContainerBuilder = require("@helpers/ContainerBuilder");
const emojis = require("@root/emojis.json");
const { getEmoji, statusEmoji } = require("@helpers/EmojiUtils");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "antinuke",
  description: "Configure advanced server protection system",
  category: "ANTINUKE",
  userPermissions: ["Administrator"],
  botPermissions: ["Administrator"],
  command: {
    enabled: true,
    usage: "setup | enable | disable | config | punishment | whitelist | admin",
    minArgsCount: 1,
    aliases: ["an"],
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "setup",
        description: "Open the interactive antinuke setup panel",
        type: ApplicationCommandOptionType.Subcommand,
      },
      {
        name: "enable",
        description: "Enable antinuke protection",
        type: ApplicationCommandOptionType.Subcommand,
      },
      {
        name: "disable",
        description: "Completely disable antinuke protection",
        type: ApplicationCommandOptionType.Subcommand,
      },
      {
        name: "config",
        description: "View current antinuke configuration",
        type: ApplicationCommandOptionType.Subcommand,
      },
      {
        name: "punishment",
        description: "Set punishment type for violators",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "type",
            description: "Punishment type",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
              { name: "Ban", value: "BAN" },
              { name: "Kick", value: "KICK" },
              { name: "Strip Roles", value: "STRIP_ROLES" },
            ],
          },
        ],
      },
      {
        name: "whitelist",
        description: "Manage the antinuke whitelist",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "action",
            description: "Add or remove from whitelist",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
              { name: "Add User", value: "add" },
              { name: "Remove User", value: "remove" },
              { name: "View List", value: "view" },
            ],
          },
          {
            name: "user",
            description: "User to add/remove from whitelist",
            type: ApplicationCommandOptionType.User,
            required: false,
          },
        ],
      },
      {
        name: "admin",
        description: "View admin/whitelist management commands",
        type: ApplicationCommandOptionType.Subcommand,
      },
    ],
  },

  async messageRun(message, args, data) {
    const settings = data.settings;
    const subcommand = args[0]?.toLowerCase();

    if (subcommand === "setup") {
      const { createSetupPanel } = require("@src/components/antinuke/setup-panel");
      const response = await createSetupPanel(message.guild);
      return message.safeReply(response);
    }

    if (subcommand === "enable") {
      return enableAntinuke(message, settings);
    }

    if (subcommand === "disable") {
      return disableAntinuke(message, settings);
    }

    if (subcommand === "config" || subcommand === "status") {
      const statusDisplay = await getStatusDisplay(message.guild);
      return message.safeReply(statusDisplay);
    }

    if (subcommand === "punishment") {
      const action = args[1]?.toUpperCase();
      if (!action || !["BAN", "KICK", "STRIP_ROLES"].includes(action)) {
        return message.safeReply(
          ContainerBuilder.info(
            "Set Punishment",
            `**Current:** ${settings.antinuke?.punishment || 'BAN'}\n\n**Available:**\n\`${data.prefix}antinuke punishment BAN\`\n\`${data.prefix}antinuke punishment KICK\`\n\`${data.prefix}antinuke punishment STRIP_ROLES\``,
            0x5865F2
          )
        );
      }
      return setPunishment(message, settings, action);
    }

    if (subcommand === "whitelist") {
      const action = args[1]?.toLowerCase();
      if (action === "add") {
        const user = message.mentions.users.first() || await message.client.users.fetch(args[2]).catch(() => null);
        if (!user) return message.safeReply(ContainerBuilder.error("No User", "Please mention a user or provide their ID", 0xFF0000));
        return addWhitelist(message, settings, user);
      } else if (action === "remove") {
        const user = message.mentions.users.first() || await message.client.users.fetch(args[2]).catch(() => null);
        if (!user) return message.safeReply(ContainerBuilder.error("No User", "Please mention a user or provide their ID", 0xFF0000));
        return removeWhitelist(message, settings, user);
      } else if (action === "show" || action === "list") {
        return showWhitelist(message, settings);
      }
      return message.safeReply(
        ContainerBuilder.info(
          "Whitelist Management",
          `**Available Commands:**\n\`${data.prefix}antinuke whitelist add <@user>\`\n\`${data.prefix}antinuke whitelist remove <@user>\`\n\`${data.prefix}antinuke whitelist show\``,
          0x5865F2
        )
      );
    }

    if (subcommand === "admin") {
      return message.safeReply(
        ContainerBuilder.info(
          "Admin Commands",
          `**Available Commands:**\n\`${data.prefix}antinuke whitelist add <@user>\` - Add admin to whitelist\n\`${data.prefix}antinuke whitelist remove <@user>\` - Remove admin\n\`${data.prefix}antinuke whitelist show\` - View admins`,
          0x5865F2
        )
      );
    }

    return message.safeReply(
      ContainerBuilder.info(
        "Antinuke System",
        `**Available Commands:**\n\n\`${data.prefix}antinuke setup\` - Interactive setup\n\`${data.prefix}antinuke enable\` - Enable protection\n\`${data.prefix}antinuke disable\` - Disable protection\n\`${data.prefix}antinuke config\` - View configuration\n\`${data.prefix}antinuke punishment <BAN/KICK/STRIP_ROLES>\`\n\`${data.prefix}antinuke whitelist\` - Manage whitelist\n\nUse individual commands like \`${data.prefix}antiban\`, \`${data.prefix}antikick\`, etc. for specific modules.`,
        0x5865F2
      )
    );
  },

  async interactionRun(interaction, data) {
    await interaction.deferReply({ ephemeral: true });
    const subcommand = interaction.options.getSubcommand();
    const settings = data.settings || await getSettings(interaction.guild);

    if (subcommand === "setup") {
      const { createSetupPanel } = require("@src/components/antinuke/setup-panel");
      const response = await createSetupPanel(interaction.guild);
      return interaction.editReply(response);
    }

    if (subcommand === "enable") {
      if (!settings.antinuke) settings.antinuke = {};
      settings.antinuke.enabled = true;
      if (!settings.antinuke.punishment) settings.antinuke.punishment = 'BAN';
      await settings.save();

      return interaction.editReply(
        ContainerBuilder.success(
          "Antinuke Enabled",
          `${emojis.success} **Antinuke protection is now active**\n\nUse individual module commands (\`/antiban\`, \`/antikick\`, etc.) to configure specific protections.`,
          0x00FF00
        )
      );
    }

    if (subcommand === "disable") {
      if (!settings.antinuke?.enabled) {
        return interaction.editReply(
          ContainerBuilder.info("Already Disabled", "Antinuke protection is not currently active", 0xFFA500)
        );
      }

      settings.antinuke.enabled = false;
      await settings.save();

      return interaction.editReply(
        ContainerBuilder.warning(
          "Antinuke Disabled",
          "🛑 **Antinuke protection has been disabled**\n\nYour server is no longer protected",
          0xFF6B00
        )
      );
    }

    if (subcommand === "config") {
      const statusDisplay = await getStatusDisplay(interaction.guild);
      return interaction.editReply(statusDisplay);
    }

    if (subcommand === "punishment") {
      const action = interaction.options.getString("type");
      if (!settings.antinuke) settings.antinuke = {};
      settings.antinuke.punishment = action;
      await settings.save();

      return interaction.editReply(
        ContainerBuilder.success(
          "Punishment Updated",
          `${emojis.success} **Punishment type set to ${action}**\n\nViolators will be ${action === 'BAN' ? 'banned' : action === 'KICK' ? 'kicked' : 'stripped of all roles'}`,
          0x00FF00
        )
      );
    }

    if (subcommand === "whitelist") {
      const action = interaction.options.getString("action");
      const user = interaction.options.getUser("user");

      if (!settings.antinuke) {
        settings.antinuke = { whitelist: [] };
      }

      if (action === "view") {
        const whitelist = settings.antinuke.whitelist || [];
        if (whitelist.length === 0) {
          return interaction.editReply(
            ContainerBuilder.info("Whitelist Empty", "No users are currently whitelisted.", 0xFFA500)
          );
        }

        const userList = await Promise.all(
          whitelist.map(async (userId) => {
            try {
              const user = await interaction.client.users.fetch(userId);
              return `• ${user.tag} (${userId})`;
            } catch {
              return `• Unknown User (${userId})`;
            }
          })
        );

        const components = [];
        components.push(ContainerBuilder.createTextDisplay("# 📋 Antinuke Whitelist"));
        components.push(ContainerBuilder.createSeparator());
        components.push(ContainerBuilder.createTextDisplay(`**${whitelist.length} Whitelisted User${whitelist.length !== 1 ? 's' : ''}**\n\n${userList.join('\n')}`));

        return interaction.editReply({
          flags: 1 << 15,
          components: [
            {
              type: 17,
              accent_color: 0x00FF00,
              components: components
            }
          ]
        });
      }

      if (!user) {
        return interaction.editReply(
          ContainerBuilder.error("Missing User", "Please specify a user to add/remove.", 0xFF0000)
        );
      }

      if (action === "add") {
        if (!settings.antinuke.whitelist) settings.antinuke.whitelist = [];
        
        if (settings.antinuke.whitelist.includes(user.id)) {
          return interaction.editReply(
            ContainerBuilder.error("Already Whitelisted", `${user.tag} is already on the whitelist.`, 0xFF0000)
          );
        }

        settings.antinuke.whitelist.push(user.id);
        await settings.save();

        return interaction.editReply(
          ContainerBuilder.success(
            "User Whitelisted",
            `${emojis.success} Added **${user.tag}** to the antinuke whitelist.\n\nThis user can now perform administrative actions without triggering antinuke.`,
            0x00FF00
          )
        );
      }

      if (action === "remove") {
        if (!settings.antinuke.whitelist?.includes(user.id)) {
          return interaction.editReply(
            ContainerBuilder.error("Not Whitelisted", `${user.tag} is not on the whitelist.`, 0xFF0000)
          );
        }

        settings.antinuke.whitelist = settings.antinuke.whitelist.filter(id => id !== user.id);
        await settings.save();

        return interaction.editReply(
          ContainerBuilder.success(
            "User Removed",
            `${emojis.success} Removed **${user.tag}** from the antinuke whitelist.`,
            0x00FF00
          )
        );
      }
    }

    if (subcommand === "admin") {
      return interaction.editReply(
        ContainerBuilder.info(
          "Admin Commands",
          `**Available Commands:**\n\`/antinuke whitelist add <@user>\` - Add admin to whitelist\n\`/antinuke whitelist remove <@user>\` - Remove admin\n\`/antinuke whitelist view\` - View admins`,
          0x5865F2
        )
      );
    }
  },
};

async function enableAntinuke(message, settings) {
  if (!settings.antinuke) settings.antinuke = {};
  settings.antinuke.enabled = true;
  if (!settings.antinuke.punishment) settings.antinuke.punishment = 'BAN';
  await settings.save();

  return message.safeReply(
    ContainerBuilder.success(
      "Antinuke Enabled",
      `${emojis.success} **Antinuke protection is now active**\n\nUse individual module commands (\`!antiban\`, \`!antikick\`, etc.) to configure specific protections.`,
      0x00FF00
    )
  );
}

async function disableAntinuke(message, settings) {
  if (!settings.antinuke?.enabled) {
    return message.safeReply(
      ContainerBuilder.info("Already Disabled", "Antinuke protection is not currently active", 0xFFA500)
    );
  }

  settings.antinuke.enabled = false;
  await settings.save();

  return message.safeReply(
    ContainerBuilder.warning(
      "Antinuke Disabled",
      "🛑 **Antinuke protection has been disabled**\n\nYour server is no longer protected",
      0xFF6B00
    )
  );
}

async function setPunishment(message, settings, action) {
  if (!settings.antinuke) settings.antinuke = {};
  settings.antinuke.punishment = action;
  await settings.save();

  return message.safeReply(
    ContainerBuilder.success(
      "Punishment Updated",
      `${emojis.success} **Punishment type set to ${action}**\n\nViolators will be ${action === 'BAN' ? 'banned' : action === 'KICK' ? 'kicked' : 'stripped of all roles'}`,
      0x00FF00
    )
  );
}

async function addWhitelist(message, settings, user) {
  if (!settings.antinuke) settings.antinuke = {};
  if (!settings.antinuke.whitelist) settings.antinuke.whitelist = [];
  
  if (settings.antinuke.whitelist.includes(user.id)) {
    return message.safeReply(
      ContainerBuilder.error("Already Whitelisted", `**${user.tag}** is already on the whitelist`, 0xFF0000)
    );
  }

  settings.antinuke.whitelist.push(user.id);
  await settings.save();

  return message.safeReply(
    ContainerBuilder.success(
      "User Whitelisted",
      `${emojis.success} **${user.tag}** added to whitelist\n\nThis user can now perform administrative actions without triggering antinuke`,
      0x00FF00
    )
  );
}

async function removeWhitelist(message, settings, user) {
  if (!settings.antinuke?.whitelist?.includes(user.id)) {
    return message.safeReply(
      ContainerBuilder.error("Not Whitelisted", `**${user.tag}** is not on the whitelist`, 0xFF0000)
    );
  }

  settings.antinuke.whitelist = settings.antinuke.whitelist.filter(id => id !== user.id);
  await settings.save();

  return message.safeReply(
    ContainerBuilder.success(
      "User Removed",
      `${emojis.success} **${user.tag}** removed from whitelist`,
      0x00FF00
    )
  );
}

async function showWhitelist(message, settings) {
  const whitelist = settings.antinuke?.whitelist || [];
  
  if (whitelist.length === 0) {
    return message.safeReply(
      ContainerBuilder.info("Whitelist Empty", "No users are currently whitelisted", 0xFFA500)
    );
  }

  const userList = await Promise.all(
    whitelist.map(async (userId) => {
      try {
        const user = await message.client.users.fetch(userId);
        return `• ${user.tag} (${userId})`;
      } catch {
        return `• Unknown User (${userId})`;
      }
    })
  );

  const components = [];
  components.push(ContainerBuilder.createTextDisplay("# 📋 Antinuke Whitelist"));
  components.push(ContainerBuilder.createSeparator());
  components.push(ContainerBuilder.createTextDisplay(`**${whitelist.length} Whitelisted User${whitelist.length !== 1 ? 's' : ''}**\n\n${userList.join('\n')}`));

  return message.safeReply({
    flags: 1 << 15,
    components: [
      {
        type: 17,
        accent_color: 0x00FF00,
        components: components
      }
    ]
  });
}

async function getStatusDisplay(guild) {
  const settings = await getSettings(guild);
  const antinuke = settings.antinuke || {};

  const components = [];
  
  components.push(ContainerBuilder.createTextDisplay("# 🛡️ Antinuke Status"));
  components.push(ContainerBuilder.createSeparator());

  const mainStatus = antinuke.enabled ? `${emojis.success} **ENABLED**` : `${emojis.error} **DISABLED**`;
  components.push(ContainerBuilder.createTextDisplay(`**System Status:** ${mainStatus}`));

  if (antinuke.log_channel) {
    components.push(ContainerBuilder.createTextDisplay(`**Log Channel:** <#${antinuke.log_channel}>`));
  }

  components.push(ContainerBuilder.createTextDisplay(`**Punishment Type:** ${antinuke.punishment || 'BAN'}`));
  components.push(ContainerBuilder.createTextDisplay(`**Whitelisted Users:** ${antinuke.whitelist?.length || 0}`));

  components.push(ContainerBuilder.createSeparator());
  components.push(ContainerBuilder.createTextDisplay("## Protection Modules"));

  const modules = [
    { name: "Anti-Ban", key: "anti_ban" },
    { name: "Anti-Kick", key: "anti_kick" },
    { name: "Anti-Role Create", key: "anti_role_create" },
    { name: "Anti-Role Delete", key: "anti_role_delete" },
    { name: "Anti-Channel Create", key: "anti_channel_create" },
    { name: "Anti-Channel Delete", key: "anti_channel_delete" },
    { name: "Anti-Webhook", key: "anti_webhook" },
    { name: "Anti-Bot Add", key: "anti_bot" },
    { name: "Anti-Server Update", key: "anti_server_update" },
    { name: "Anti-Emoji Delete", key: "anti_emoji_delete" },
    { name: "Anti-Prune", key: "anti_prune" },
  ];

  modules.forEach(module => {
    const enabled = antinuke[module.key]?.enabled;
    const status = enabled ? emojis.success : emojis.error;
    const limit = antinuke[module.key]?.limit;
    const extra = limit ? ` (${limit}/10s)` : "";
    components.push(ContainerBuilder.createTextDisplay(`${status} **${module.name}**${extra}`));
  });

  return {
    flags: 1 << 15,
    components: [
      {
        type: 17,
        accent_color: antinuke.enabled ? 0x00FF00 : 0xFF0000,
        components: components
      }
    ]
  };
}
