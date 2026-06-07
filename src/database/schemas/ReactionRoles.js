const { pool } = require("../pg");

const TABLE = "reaction_roles";
const rrCache = new Map();
const getKey = (guildId, channelId, messageId) => `${guildId}|${channelId}|${messageId}`;

module.exports = {
  model: {
    find: async () => {
      const res = await pool.query(`SELECT guild_id, channel_id, message_id, roles FROM "${TABLE}"`);
      return res.rows.map((r) => ({
        guild_id: r.guild_id,
        channel_id: r.channel_id,
        message_id: r.message_id,
        roles: r.roles,
      }));
    },
  },

  cacheReactionRoles: async (client) => {
    rrCache.clear();
    const res = await pool.query(`SELECT guild_id, channel_id, message_id, roles FROM "${TABLE}"`);
    for (const row of res.rows) {
      const guild = client.guilds.cache.get(row.guild_id);
      if (!guild) continue;
      if (!guild.channels.cache.has(row.channel_id)) continue;
      rrCache.set(getKey(row.guild_id, row.channel_id, row.message_id), row.roles);
    }
  },

  getReactionRoles: (guildId, channelId, messageId) =>
    rrCache.get(getKey(guildId, channelId, messageId)) || [],

  addReactionRole: async (guildId, channelId, messageId, emote, roleId) => {
    const key = getKey(guildId, channelId, messageId);

    const res = await pool.query(`SELECT roles FROM "${TABLE}" WHERE id = $1`, [key]);

    let roles = res.rows.length ? res.rows[0].roles : [];
    roles = roles.filter((r) => r.emote !== emote);
    roles.push({ emote, role_id: roleId });

    await pool.query(
      `INSERT INTO "${TABLE}" (id, guild_id, channel_id, message_id, roles)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (id) DO UPDATE SET roles = $5::jsonb`,
      [key, guildId, channelId, messageId, JSON.stringify(roles)]
    );

    rrCache.set(key, roles);
  },

  removeReactionRole: async (guildId, channelId, messageId) => {
    const key = getKey(guildId, channelId, messageId);
    await pool.query(`DELETE FROM "${TABLE}" WHERE id = $1`, [key]);
    rrCache.delete(key);
  },
};
