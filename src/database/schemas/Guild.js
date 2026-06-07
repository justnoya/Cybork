const { pool, makeSaveable } = require("../pg");
const { CACHE_SIZE, PREFIX_COMMANDS } = require("@root/config.js");
const FixedSizeMap = require("fixedsize-map");
const { getUser } = require("./User");

const cache = new FixedSizeMap(CACHE_SIZE.GUILDS);
const TABLE = "guilds";

function defaultGuildData(guild) {
  return {
    _id: guild.id,
    data: {
      name: guild.name,
      region: guild.preferredLocale,
      owner: guild.ownerId,
      joinedAt: guild.joinedAt,
    },
    prefix: PREFIX_COMMANDS.DEFAULT_PREFIX,
    developers: [],
    noprefix_users: [],
    custom_aliases: [],
    counters: [],
    stats: { enabled: false },
    invite: { tracking: false, ranks: [] },
    autorole: { humans: [], bots: [] },
    automod: {
      strikes: 10,
      action: "TIMEOUT",
      wh_channels: [],
      anti_spam: { enabled: false, threshold: 5, timeframe: 5 },
      anti_badwords: { enabled: false, keywords: [], action: "DELETE" },
      anti_zalgo: { enabled: false, threshold: 50 },
      anti_caps: { enabled: false, threshold: 70, min_length: 10 },
    },
    welcome: { enabled: false, channels: [], auto_delete: { enabled: false, delay: 10 }, embed: {} },
    farewell: { enabled: false, embed: {} },
    logging: {
      enabled: false,
      channel_logs: { enabled: false, events: { create: true, delete: true, update: true } },
      member_logs: { enabled: false, events: { join: true, leave: true, role_add: true, role_remove: true, nickname: true } },
      message_logs: { enabled: false, events: { delete: true, bulk_delete: true, edit: true }, ignore_channels: [] },
      mod_logs: { enabled: false, events: { ban: true, unban: true, kick: true, timeout: true, warn: true } },
      role_logs: { enabled: false, events: { create: true, delete: true, update: true } },
    },
    ticket: { limit: 10, categories: [] },
    suggestions: { enabled: false, staff_roles: [] },
    antinuke: {
      enabled: false,
      whitelist: [],
      punishment: "BAN",
      anti_ban: { enabled: false, limit: 3, timeframe: 10 },
      anti_kick: { enabled: false, limit: 3, timeframe: 10 },
      anti_role_create: { enabled: false, limit: 3, timeframe: 10 },
      anti_role_delete: { enabled: false, limit: 3, timeframe: 10 },
      anti_channel_create: { enabled: false, limit: 3, timeframe: 10 },
      anti_channel_delete: { enabled: false, limit: 3, timeframe: 10 },
      anti_webhook: { enabled: false, limit: 3, timeframe: 10 },
      anti_bot: { enabled: false, action: "KICK" },
      anti_server_update: { enabled: false },
      anti_emoji_delete: { enabled: false, limit: 3, timeframe: 10 },
      anti_prune: { enabled: false },
    },
    max_warn: { action: "KICK", limit: 5 },
  };
}

function applyMigrations(guildData) {
  let needsSave = false;

  if (guildData.autorole && typeof guildData.autorole === "string") {
    guildData.autorole = { humans: [guildData.autorole], bots: [] };
    needsSave = true;
  } else if (!guildData.autorole) {
    guildData.autorole = { humans: [], bots: [] };
  }

  if (guildData.automod) {
    if (typeof guildData.automod.anti_spam === "boolean") {
      const wasEnabled = guildData.automod.anti_spam;
      guildData.automod.anti_spam = { enabled: wasEnabled, threshold: 5, timeframe: 5 };
      needsSave = true;
    } else if (!guildData.automod.anti_spam) {
      guildData.automod.anti_spam = { enabled: false, threshold: 5, timeframe: 5 };
    }
    if (!guildData.automod.anti_badwords) {
      guildData.automod.anti_badwords = { enabled: false, keywords: [], action: "DELETE" };
    }
    if (!guildData.automod.anti_zalgo) {
      guildData.automod.anti_zalgo = { enabled: false, threshold: 50 };
    }
    if (!guildData.automod.anti_caps) {
      guildData.automod.anti_caps = { enabled: false, threshold: 70, min_length: 10 };
    }
  }

  if (guildData.welcome && !guildData.welcome.auto_delete) {
    guildData.welcome.auto_delete = { enabled: false, delay: 10 };
  }

  if (!guildData.logging) {
    guildData.logging = {
      enabled: false,
      channel_logs: { enabled: false },
      member_logs: { enabled: false },
      message_logs: { enabled: false },
      mod_logs: { enabled: false },
      role_logs: { enabled: false },
    };
    needsSave = true;
  }

  if (guildData.developers && guildData.developers.length > 0) {
    if (!guildData.noprefix_users) guildData.noprefix_users = [];
    for (const userId of guildData.developers) {
      if (!guildData.noprefix_users.includes(userId)) {
        guildData.noprefix_users.push(userId);
        needsSave = true;
      }
    }
  }

  return needsSave;
}

class GuildModel {
  constructor(data) {
    Object.assign(this, data);
    const id = this._id;
    const self = this;
    Object.defineProperty(this, "save", {
      enumerable: false,
      configurable: true,
      value: async () => {
        const snapshot = JSON.parse(JSON.stringify(self));
        await pool.query(
          `INSERT INTO "${TABLE}" (id, data, updated_at)
           VALUES ($1, $2::jsonb, NOW())
           ON CONFLICT (id) DO UPDATE SET data = $2::jsonb, updated_at = NOW()`,
          [id, JSON.stringify(snapshot)]
        );
      },
    });
  }

  static async findOne(filter) {
    if (!filter?._id) return null;
    const res = await pool.query(`SELECT data FROM "${TABLE}" WHERE id = $1`, [filter._id]);
    if (!res.rows.length) return null;
    return new GuildModel(res.rows[0].data);
  }
}

module.exports = {
  GuildModel,
  getSettings: async (guild) => {
    if (!guild) throw new Error("Guild is undefined");
    if (!guild.id) throw new Error("Guild Id is undefined");

    const cached = cache.get(guild.id);
    if (cached) return cached;

    const res = await pool.query(`SELECT data FROM "${TABLE}" WHERE id = $1`, [guild.id]);

    let guildData;
    if (!res.rows.length) {
      guild
        .fetchOwner()
        .then(async (owner) => {
          const userDb = await getUser(owner.user);
          await userDb.save();
        })
        .catch(() => {});

      guildData = defaultGuildData(guild);
      await pool.query(
        `INSERT INTO "${TABLE}" (id, data) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING`,
        [guild.id, JSON.stringify(guildData)]
      );
    } else {
      guildData = res.rows[0].data;
    }

    const needsSave = applyMigrations(guildData);
    const doc = makeSaveable(TABLE, guild.id, guildData);
    if (needsSave) await doc.save();

    cache.add(guild.id, doc);
    return doc;
  },
};
