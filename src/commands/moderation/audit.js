const { ApplicationCommandOptionType, AuditLogEvent, ComponentType } = require("discord.js");
const InteractionUtils = require("@helpers/InteractionUtils");

const AUDIT_LOG_ACTIONS = {
  ALL: "All Actions",
  MEMBER_KICK: "Member Kick",
  MEMBER_BAN_ADD: "Member Ban",
  MEMBER_BAN_REMOVE: "Member Unban",
  MEMBER_UPDATE: "Member Update",
  MEMBER_ROLE_UPDATE: "Member Role Update",
  CHANNEL_CREATE: "Channel Create",
  CHANNEL_DELETE: "Channel Delete",
  CHANNEL_UPDATE: "Channel Update",
  ROLE_CREATE: "Role Create",
  ROLE_DELETE: "Role Delete",
  ROLE_UPDATE: "Role Update",
  MESSAGE_DELETE: "Message Delete",
  MESSAGE_BULK_DELETE: "Bulk Message Delete",
};

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "audit",
  description: "View server audit logs with filters",
  category: "MODERATION",
  botPermissions: ["ViewAuditLog"],
  userPermissions: ["ViewAuditLog"],
  command: {
    enabled: true,
    aliases: ["auditlog", "auditlogs"],
    usage: "[action_type] [limit]",
  },
  slashCommand: {
    enabled: true,
    ephemeral: true,
    options: [
      {
        name: "action",
        description: "Filter by action type",
        type: ApplicationCommandOptionType.String,
        required: false,
        choices: [
          { name: "All Actions", value: "all" },
          { name: "Member Kicks", value: "kick" },
          { name: "Member Bans", value: "ban" },
          { name: "Member Unbans", value: "unban" },
          { name: "Role Changes", value: "role" },
          { name: "Channel Changes", value: "channel" },
          { name: "Message Deletions", value: "message" },
        ],
      },
      {
        name: "limit",
        description: "Number of entries to fetch (max 100)",
        type: ApplicationCommandOptionType.Integer,
        required: false,
        minValue: 1,
        maxValue: 100,
      },
    ],
  },

  async messageRun(message, args) {
    await showAuditLogs(message, false, args[0] || "all", parseInt(args[1]) || 25);
  },

  async interactionRun(interaction) {
    const action = interaction.options.getString("action") || "all";
    const limit = interaction.options.getInteger("limit") || 25;
    await showAuditLogs(interaction, true, action, limit);
  },
};

/**
 * Show audit logs with pagination
 */
async function showAuditLogs(source, isInteraction, actionFilter, limit) {
  const guild = source.guild;

  const loadingEmbed = InteractionUtils.createLoadingEmbed("Fetching audit logs...");
  const msg = isInteraction
    ? await source.editReply({ embeds: [loadingEmbed] })
    : await source.channel.send({ embeds: [loadingEmbed] });

  try {
    const actionType = getActionType(actionFilter);
    const fetchOptions = { limit: Math.min(limit, 100) };
    
    if (actionType) {
      fetchOptions.type = actionType;
    }

    const auditLogs = await guild.fetchAuditLogs(fetchOptions);
    const entries = Array.from(auditLogs.entries.values());

    if (entries.length === 0) {
      const embed = InteractionUtils.createWarningEmbed("No audit log entries found for the selected filter.");
      return msg.edit({ embeds: [embed], components: [] });
    }

    const state = {
      entries,
      currentPage: 0,
      totalPages: entries.length,
      userId: isInteraction ? source.user.id : source.author.id,
      actionFilter,
    };

    await displayAuditPage(msg, state);
    setupPaginationCollector(msg, state);
  } catch (error) {
    console.error("Audit log fetch error:", error);
    const errorEmbed = InteractionUtils.createErrorEmbed(
      error.code === 50013 
        ? "I don't have permission to view audit logs."
        : `Failed to fetch audit logs: ${error.message}`
    );
    await msg.edit({ embeds: [errorEmbed], components: [] });
  }
}

/**
 * Display a specific audit log entry
 */
async function displayAuditPage(message, state) {
  const entry = state.entries[state.currentPage];
  
  const executor = entry.executor ? `${entry.executor.tag} (${entry.executor.id})` : "Unknown";
  const target = entry.target ? (entry.target.tag || entry.target.name || entry.target.id || "Unknown") : "Unknown";
  const action = getActionName(entry.action);
  const reason = entry.reason || "No reason provided";
  
  const timestamp = `<t:${Math.floor(entry.createdTimestamp / 1000)}:F>`;
  const relativeTime = `<t:${Math.floor(entry.createdTimestamp / 1000)}:R>`;

  const changes = formatChanges(entry.changes);

  const embed = InteractionUtils.createThemedEmbed({
    title: `📋 Audit Log Entry #${state.currentPage + 1}`,
    fields: [
      {
        name: "Action",
        value: `\`${action}\``,
        inline: true,
      },
      {
        name: "Executor",
        value: executor,
        inline: true,
      },
      {
        name: "Target",
        value: target,
        inline: true,
      },
      {
        name: "Reason",
        value: reason,
        inline: false,
      },
      {
        name: "Timestamp",
        value: `${timestamp}\n${relativeTime}`,
        inline: false,
      },
    ],
    footer: `Entry ${state.currentPage + 1} of ${state.totalPages} | Filter: ${state.actionFilter}`,
    timestamp: true,
  });

  if (changes) {
    embed.addFields({
      name: "Changes",
      value: changes,
      inline: false,
    });
  }

  const navButtons = InteractionUtils.createNavigationButtons({
    currentPage: state.currentPage,
    totalPages: state.totalPages,
  });

  await message.edit({ embeds: [embed], components: [navButtons] });
}

/**
 * Setup pagination collector
 */
function setupPaginationCollector(message, state) {
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === state.userId,
    time: 300000,
  });

  collector.on("collect", async (interaction) => {
    try {
      if (interaction.customId === "nav_first") {
        state.currentPage = 0;
      } else if (interaction.customId === "nav_prev") {
        state.currentPage = Math.max(0, state.currentPage - 1);
      } else if (interaction.customId === "nav_next") {
        state.currentPage = Math.min(state.totalPages - 1, state.currentPage + 1);
      } else if (interaction.customId === "nav_last") {
        state.currentPage = state.totalPages - 1;
      }

      await interaction.deferUpdate();
      await displayAuditPage(message, state);
    } catch (error) {
      console.error("Pagination collector error:", error);
    }
  });

  collector.on("end", () => {
    if (message && message.components) {
      message.edit({ 
        components: InteractionUtils.disableComponents(message.components) 
      }).catch(() => {});
    }
  });
}

/**
 * Get action type from filter string
 */
function getActionType(filter) {
  const filterMap = {
    kick: AuditLogEvent.MemberKick,
    ban: AuditLogEvent.MemberBanAdd,
    unban: AuditLogEvent.MemberBanRemove,
    role: AuditLogEvent.MemberRoleUpdate,
    channel: AuditLogEvent.ChannelUpdate,
    message: AuditLogEvent.MessageDelete,
  };

  return filterMap[filter?.toLowerCase()] || null;
}

/**
 * Get human-readable action name
 */
function getActionName(action) {
  const actionNames = {
    [AuditLogEvent.GuildUpdate]: "Server Update",
    [AuditLogEvent.ChannelCreate]: "Channel Create",
    [AuditLogEvent.ChannelUpdate]: "Channel Update",
    [AuditLogEvent.ChannelDelete]: "Channel Delete",
    [AuditLogEvent.ChannelOverwriteCreate]: "Permission Overwrite Create",
    [AuditLogEvent.ChannelOverwriteUpdate]: "Permission Overwrite Update",
    [AuditLogEvent.ChannelOverwriteDelete]: "Permission Overwrite Delete",
    [AuditLogEvent.MemberKick]: "Member Kick",
    [AuditLogEvent.MemberPrune]: "Member Prune",
    [AuditLogEvent.MemberBanAdd]: "Member Ban",
    [AuditLogEvent.MemberBanRemove]: "Member Unban",
    [AuditLogEvent.MemberUpdate]: "Member Update",
    [AuditLogEvent.MemberRoleUpdate]: "Member Role Update",
    [AuditLogEvent.RoleCreate]: "Role Create",
    [AuditLogEvent.RoleUpdate]: "Role Update",
    [AuditLogEvent.RoleDelete]: "Role Delete",
    [AuditLogEvent.InviteCreate]: "Invite Create",
    [AuditLogEvent.InviteUpdate]: "Invite Update",
    [AuditLogEvent.InviteDelete]: "Invite Delete",
    [AuditLogEvent.WebhookCreate]: "Webhook Create",
    [AuditLogEvent.WebhookUpdate]: "Webhook Update",
    [AuditLogEvent.WebhookDelete]: "Webhook Delete",
    [AuditLogEvent.EmojiCreate]: "Emoji Create",
    [AuditLogEvent.EmojiUpdate]: "Emoji Update",
    [AuditLogEvent.EmojiDelete]: "Emoji Delete",
    [AuditLogEvent.MessageDelete]: "Message Delete",
    [AuditLogEvent.MessageBulkDelete]: "Bulk Message Delete",
    [AuditLogEvent.MessagePin]: "Message Pin",
    [AuditLogEvent.MessageUnpin]: "Message Unpin",
  };

  return actionNames[action] || `Unknown Action (${action})`;
}

/**
 * Format audit log changes
 */
function formatChanges(changes) {
  if (!changes || changes.length === 0) return null;

  const formatted = changes.slice(0, 5).map(change => {
    const key = change.key;
    const oldValue = change.old !== undefined ? String(change.old).substring(0, 100) : "None";
    const newValue = change.new !== undefined ? String(change.new).substring(0, 100) : "None";
    
    return `**${key}**: \`${oldValue}\` → \`${newValue}\``;
  });

  if (changes.length > 5) {
    formatted.push(`*...and ${changes.length - 5} more changes*`);
  }

  return formatted.join("\n");
}
