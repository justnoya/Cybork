const { pool } = require("../pg");

const TABLE = "translate_logs";

module.exports = {
  model: {},

  isTranslated: async (message, code) => {
    const res = await pool.query(
      `SELECT 1 FROM "${TABLE}"
       WHERE guild_id = $1 AND channel_id = $2 AND message_id = $3 AND emoji = $4
       LIMIT 1`,
      [message.guildId, message.channelId, message.id, code]
    );
    return res.rows.length > 0 ? true : null;
  },

  logTranslation: async (message, code) => {
    await pool.query(
      `INSERT INTO "${TABLE}" (guild_id, channel_id, message_id, emoji)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (guild_id, channel_id, message_id, emoji) DO NOTHING`,
      [message.guildId, message.channelId, message.id, code]
    );
  },
};
