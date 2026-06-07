const { pool, makeSaveable } = require("../pg");

const TABLE = "parties";

async function upsertParty(partyId, guildId, data) {
  await pool.query(
    `INSERT INTO "${TABLE}" (id, guild_id, data)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (id) DO UPDATE SET data = $3::jsonb, updated_at = NOW()`,
    [partyId, guildId, JSON.stringify(data)]
  );
}

const PartyModel = {
  findOne: async (filter) => {
    let res;
    if (filter.partyId) {
      res = await pool.query(`SELECT data FROM "${TABLE}" WHERE id = $1`, [filter.partyId]);
    } else if (filter.guildId && filter.status) {
      res = await pool.query(
        `SELECT data FROM "${TABLE}" WHERE guild_id = $1 AND data->>'status' = $2 LIMIT 1`,
        [filter.guildId, filter.status]
      );
    } else {
      return null;
    }
    if (!res.rows.length) return null;
    const doc = makeSaveable(TABLE, res.rows[0].data.partyId, res.rows[0].data);
    return doc;
  },

  find: async (filter = {}) => {
    let res;
    if (filter.guildId && filter.status) {
      res = await pool.query(
        `SELECT data FROM "${TABLE}" WHERE guild_id = $1 AND data->>'status' = $2`,
        [filter.guildId, filter.status]
      );
    } else {
      res = await pool.query(`SELECT data FROM "${TABLE}"`);
    }
    return res.rows.map((r) => {
      const doc = makeSaveable(TABLE, r.data.partyId, r.data);
      return doc;
    });
  },

  create: async (data) => {
    await upsertParty(data.partyId, data.guildId, data);
    return makeSaveable(TABLE, data.partyId, data);
  },

  findOneAndUpdate: async (filter, update, options = {}) => {
    const existing = await PartyModel.findOne(filter);
    const base = existing ? JSON.parse(JSON.stringify(existing)) : {};
    const setData = update.$set || update;
    const merged = Object.assign({}, base, setData);
    await upsertParty(merged.partyId || filter.partyId, merged.guildId, merged);
    return options.new !== false ? makeSaveable(TABLE, merged.partyId, merged) : existing;
  },

  deleteOne: async (filter) => {
    if (filter.partyId) {
      await pool.query(`DELETE FROM "${TABLE}" WHERE id = $1`, [filter.partyId]);
    }
  },
};

module.exports = PartyModel;
