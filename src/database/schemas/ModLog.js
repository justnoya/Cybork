const { pool } = require("../pg");

const TABLE = "mod_logs";

module.exports = {
  model: {
    find: async (filter = {}) => {
      if (filter.guild_id && filter.member_id && filter.type) {
        const res = await pool.query(
          `SELECT data FROM "${TABLE}" WHERE guild_id = $1 AND member_id = $2 AND data->>'type' = $3`,
          [filter.guild_id, filter.member_id, filter.type]
        );
        return res.rows.map((r) => r.data);
      }
      const res = await pool.query(`SELECT data FROM "${TABLE}"`);
      return res.rows.map((r) => r.data);
    },
  },

  addModLogToDb: async (admin, target, reason, type) => {
    const data = {
      guild_id: admin.guild.id,
      member_id: target.id,
      reason,
      admin: { id: admin.id, tag: admin.user.tag },
      type,
      created_at: new Date().toISOString(),
    };
    await pool.query(
      `INSERT INTO "${TABLE}" (guild_id, member_id, data) VALUES ($1, $2, $3::jsonb)`,
      [admin.guild.id, target.id, JSON.stringify(data)]
    );
  },

  getWarningLogs: async (guildId, targetId) => {
    const res = await pool.query(
      `SELECT data FROM "${TABLE}" WHERE guild_id = $1 AND member_id = $2 AND data->>'type' = 'WARN'`,
      [guildId, targetId]
    );
    return res.rows.map((r) => r.data);
  },

  clearWarningLogs: async (guildId, targetId) => {
    await pool.query(
      `DELETE FROM "${TABLE}" WHERE guild_id = $1 AND member_id = $2 AND data->>'type' = 'WARN'`,
      [guildId, targetId]
    );
  },
};
