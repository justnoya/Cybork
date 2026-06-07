const { pool } = require("../pg");

const TABLE = "giveaways";

const Model = {
  find: () => ({
    lean: () => ({
      exec: async () => {
        const res = await pool.query(`SELECT data FROM "${TABLE}" ORDER BY created_at ASC`);
        return res.rows.map((r) => r.data);
      },
    }),
  }),

  create: async (giveawayData) => {
    const id = giveawayData.messageId;
    await pool.query(
      `INSERT INTO "${TABLE}" (id, data) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING`,
      [id, JSON.stringify(giveawayData)]
    );
    return giveawayData;
  },

  updateOne: (filter, update) => ({
    exec: async () => {
      const res = await pool.query(`SELECT data FROM "${TABLE}" WHERE id = $1`, [filter.messageId]);
      if (!res.rows.length) return { modifiedCount: 0 };

      const existing = res.rows[0].data;
      const setData = update.$set || {};
      const merged = Object.assign({}, existing, setData);

      await pool.query(
        `UPDATE "${TABLE}" SET data = $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(merged), filter.messageId]
      );
      return { modifiedCount: 1 };
    },
  }),

  findOne: (filter) => ({
    lean: () => ({
      exec: async () => {
        const res = await pool.query(`SELECT data FROM "${TABLE}" WHERE id = $1`, [filter.messageId]);
        return res.rows.length ? res.rows[0].data : null;
      },
    }),
  }),

  deleteOne: (filter) => ({
    exec: async () => {
      await pool.query(`DELETE FROM "${TABLE}" WHERE id = $1`, [filter.messageId]);
      return { deletedCount: 1 };
    },
  }),
};

module.exports = Model;
