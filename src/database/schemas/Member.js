const { pool, makeSaveable } = require("../pg");
const { CACHE_SIZE } = require("@root/config.js");
const FixedSizeMap = require("fixedsize-map");

const cache = new FixedSizeMap(CACHE_SIZE.MEMBERS);
const TABLE = "members";

module.exports = {
  getMember: async (guildId, memberId) => {
    const key = `${guildId}|${memberId}`;
    if (cache.contains(key)) return cache.get(key);

    const res = await pool.query(`SELECT data FROM "${TABLE}" WHERE id = $1`, [key]);

    let memberData;
    if (!res.rows.length) {
      memberData = {
        guild_id: guildId,
        member_id: memberId,
        strikes: 0,
        warnings: 0,
        invite_data: { inviter: null, code: null, tracked: 0, fake: 0, left: 0, added: 0 },
      };
      await pool.query(
        `INSERT INTO "${TABLE}" (id, guild_id, data) VALUES ($1, $2, $3::jsonb) ON CONFLICT (id) DO NOTHING`,
        [key, guildId, JSON.stringify(memberData)]
      );
    } else {
      memberData = res.rows[0].data;
    }

    const doc = makeSaveable(TABLE, key, memberData);
    cache.add(key, doc);
    return doc;
  },

  getInvitesLb: async (guildId, limit = 10) => {
    const res = await pool.query(
      `SELECT member_id, invites FROM (
         SELECT
           data->>'member_id' AS member_id,
           (
             COALESCE((data->'invite_data'->>'tracked')::numeric, 0) +
             COALESCE((data->'invite_data'->>'added')::numeric, 0) -
             COALESCE((data->'invite_data'->>'left')::numeric, 0) -
             COALESCE((data->'invite_data'->>'fake')::numeric, 0)
           ) AS invites
         FROM "${TABLE}"
         WHERE guild_id = $1
       ) sub
       WHERE invites > 0
       ORDER BY invites DESC
       LIMIT $2`,
      [guildId, limit]
    );
    return res.rows;
  },
};
