const { pool, makeSaveable } = require("../pg");
const { CACHE_SIZE } = require("@root/config.js");
const FixedSizeMap = require("fixedsize-map");

const cache = new FixedSizeMap(CACHE_SIZE.USERS);
const TABLE = "users";

module.exports = {
  getUser: async (user) => {
    if (!user) throw new Error("User is required.");
    if (!user.id) throw new Error("User Id is required.");

    const cached = cache.get(user.id);
    if (cached) return cached;

    const res = await pool.query(`SELECT data FROM "${TABLE}" WHERE id = $1`, [user.id]);

    let userData;
    if (!res.rows.length) {
      userData = {
        _id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        logged: false,
        coins: 0,
        bank: 0,
        reputation: { received: 0, given: 0, timestamp: null },
        daily: { streak: 0, timestamp: null },
        profile: { bio: null, banner: "gradient_blue", bannerColor: null },
      };
      await pool.query(
        `INSERT INTO "${TABLE}" (id, data) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING`,
        [user.id, JSON.stringify(userData)]
      );
    } else {
      userData = res.rows[0].data;
      if (!userData.username || !userData.discriminator) {
        userData.username = user.username;
        userData.discriminator = user.discriminator;
      }
    }

    const doc = makeSaveable(TABLE, user.id, userData);
    cache.add(user.id, doc);
    return doc;
  },

  updateCache: (userId, userDb) => {
    cache.add(userId, userDb);
  },

  clearCache: (userId) => {
    if (cache.contains(userId)) cache.remove(userId);
  },

  getReputationLb: async (limit = 10) => {
    const res = await pool.query(
      `SELECT data FROM "${TABLE}"
       WHERE (data->'reputation'->>'received')::numeric > 0
       ORDER BY (data->'reputation'->>'received')::numeric DESC,
                (data->'reputation'->>'given')::numeric ASC
       LIMIT $1`,
      [limit]
    );
    return res.rows.map((r) => r.data);
  },
};
