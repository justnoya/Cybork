const { pool, makeSaveable } = require("../pg");
const { CACHE_SIZE } = require("@root/config.js");
const FixedSizeMap = require("fixedsize-map");

const cache = new FixedSizeMap(CACHE_SIZE.MEMBERS);
const TABLE = "member_stats";

module.exports = {
  getMemberStats: async (guildId, memberId) => {
    const key = `${guildId}|${memberId}`;
    if (cache.contains(key)) return cache.get(key);

    const res = await pool.query(`SELECT data FROM "${TABLE}" WHERE id = $1`, [key]);

    let statsData;
    if (!res.rows.length) {
      statsData = {
        guild_id: guildId,
        member_id: memberId,
        messages: 0,
        voice: { connections: 0, time: 0 },
        commands: { prefix: 0, slash: 0 },
        contexts: { message: 0, user: 0 },
        xp: 0,
        level: 1,
      };
      await pool.query(
        `INSERT INTO "${TABLE}" (id, guild_id, data) VALUES ($1, $2, $3::jsonb) ON CONFLICT (id) DO NOTHING`,
        [key, guildId, JSON.stringify(statsData)]
      );
    } else {
      statsData = res.rows[0].data;
    }

    const doc = makeSaveable(TABLE, key, statsData);
    cache.add(key, doc);
    return doc;
  },

  getXpLb: async (guildId, limit = 10) => {
    const res = await pool.query(
      `SELECT data FROM "${TABLE}"
       WHERE guild_id = $1
       ORDER BY (data->>'level')::numeric DESC, (data->>'xp')::numeric DESC
       LIMIT $2`,
      [guildId, limit]
    );
    return res.rows.map((r) => r.data);
  },
};
