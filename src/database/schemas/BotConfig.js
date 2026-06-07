const { pool, makeSaveable } = require("../pg");

const TABLE = "botconfig";

module.exports = {
  getBotConfig: async () => {
    const res = await pool.query(`SELECT data FROM "${TABLE}" WHERE id = 'global'`);

    let configData;
    if (!res.rows.length) {
      configData = { _id: "global", noprefix_users: [], access_users: [] };
      await pool.query(
        `INSERT INTO "${TABLE}" (id, data) VALUES ('global', $1::jsonb) ON CONFLICT (id) DO NOTHING`,
        [JSON.stringify(configData)]
      );
    } else {
      configData = res.rows[0].data;
    }

    return makeSaveable(TABLE, "global", configData);
  },

  Model: {
    findById: async (id) => {
      const res = await pool.query(`SELECT data FROM "${TABLE}" WHERE id = $1`, [id]);
      if (!res.rows.length) return null;
      return makeSaveable(TABLE, id, res.rows[0].data);
    },
  },
};
