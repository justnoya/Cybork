const { pool } = require("./pg");

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS guilds (
        id          TEXT PRIMARY KEY,
        data        JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS users (
        id          TEXT PRIMARY KEY,
        data        JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS members (
        id          TEXT PRIMARY KEY,
        guild_id    TEXT NOT NULL,
        data        JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_members_guild ON members(guild_id);

      CREATE TABLE IF NOT EXISTS member_stats (
        id          TEXT PRIMARY KEY,
        guild_id    TEXT NOT NULL,
        data        JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_member_stats_guild ON member_stats(guild_id);

      CREATE TABLE IF NOT EXISTS botconfig (
        id          TEXT PRIMARY KEY,
        data        JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS giveaways (
        id          TEXT PRIMARY KEY,
        data        JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS reaction_roles (
        id          TEXT PRIMARY KEY,
        guild_id    TEXT NOT NULL,
        channel_id  TEXT NOT NULL,
        message_id  TEXT NOT NULL,
        roles       JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_rr_guild ON reaction_roles(guild_id);

      CREATE TABLE IF NOT EXISTS mod_logs (
        id          BIGSERIAL PRIMARY KEY,
        guild_id    TEXT NOT NULL,
        member_id   TEXT,
        data        JSONB NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_mod_logs_gm ON mod_logs(guild_id, member_id);

      CREATE TABLE IF NOT EXISTS automod_logs (
        id          BIGSERIAL PRIMARY KEY,
        guild_id    TEXT NOT NULL,
        member_id   TEXT NOT NULL,
        data        JSONB NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_automod_logs_gm ON automod_logs(guild_id, member_id);

      CREATE TABLE IF NOT EXISTS translate_logs (
        id          BIGSERIAL PRIMARY KEY,
        guild_id    TEXT NOT NULL,
        channel_id  TEXT NOT NULL,
        message_id  TEXT NOT NULL,
        emoji       TEXT NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_translate_unique
        ON translate_logs(guild_id, channel_id, message_id, emoji);

      CREATE TABLE IF NOT EXISTS suggestions (
        id          BIGSERIAL PRIMARY KEY,
        guild_id    TEXT NOT NULL,
        message_id  TEXT,
        data        JSONB NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_suggestions_gm ON suggestions(guild_id, message_id);

      CREATE TABLE IF NOT EXISTS parties (
        id          TEXT PRIMARY KEY,
        guild_id    TEXT NOT NULL,
        data        JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_parties_guild ON parties(guild_id);
    `);
    process.stdout.write("CYBORK:DATABASE:PostgreSQL\n");
  } finally {
    client.release();
  }
}

module.exports = { initializeDatabase };
