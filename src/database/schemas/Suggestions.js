const { pool, makeSaveable } = require("../pg");

const TABLE = "suggestions";

async function findRowByGuildMessage(guildId, messageId) {
  const res = await pool.query(
    `SELECT id, data FROM "${TABLE}" WHERE guild_id = $1 AND message_id = $2 LIMIT 1`,
    [guildId, messageId]
  );
  return res.rows[0] || null;
}

module.exports = {
  model: {},

  addSuggestion: async (message, userId, suggestion) => {
    const data = {
      guild_id: message.guildId,
      channel_id: message.channelId,
      message_id: message.id,
      user_id: userId,
      suggestion,
      status: "PENDING",
      stats: { upvotes: 0, downvotes: 0 },
      status_updates: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const res = await pool.query(
      `INSERT INTO "${TABLE}" (guild_id, message_id, data) VALUES ($1, $2, $3::jsonb) RETURNING id`,
      [message.guildId, message.id, JSON.stringify(data)]
    );
    return makeSaveable(TABLE, res.rows[0].id, data);
  },

  findSuggestion: async (guildId, messageId) => {
    const row = await findRowByGuildMessage(guildId, messageId);
    if (!row) return null;
    const doc = makeSaveable(TABLE, row.id, row.data);
    doc.save = async () => {
      const snapshot = JSON.parse(JSON.stringify(doc));
      delete snapshot.save;
      await pool.query(
        `UPDATE "${TABLE}" SET data = $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(snapshot), row.id]
      );
    };
    return doc;
  },

  deleteSuggestionDb: async (guildId, messageId, memberId, reason) => {
    const row = await findRowByGuildMessage(guildId, messageId);
    if (!row) return;
    const data = row.data;
    data.status = "DELETED";
    if (!data.status_updates) data.status_updates = [];
    data.status_updates.push({
      user_id: memberId,
      status: "DELETED",
      reason,
      timestamp: new Date().toISOString(),
    });
    data.updated_at = new Date().toISOString();
    await pool.query(
      `UPDATE "${TABLE}" SET data = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(data), row.id]
    );
  },
};
