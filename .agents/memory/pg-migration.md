---
name: MongoDB to PostgreSQL migration
description: Full architectural migration from Mongoose/MongoDB to Replit PostgreSQL using JSONB columns. All schemas rewritten.
---

## What was done
All Mongoose schemas replaced with native `pg` queries backed by JSONB columns. Bot now uses Replit's built-in PostgreSQL (`DATABASE_URL`).

## Key files
- `src/database/pg.js` — Pool connection + `makeSaveable(tableName, id, obj)` helper (adds non-enumerable `.save()` to any object)
- `src/database/initDb.js` — `CREATE TABLE IF NOT EXISTS` for all 12 tables (runs on startup)
- `src/database/mongoose.js` — Now just wraps `initializeDatabase()` from initDb, kept for backwards compat import name

## Table → schema mapping
- `guilds` → Guild.js (JSONB, id = guild.id or "GLOBAL_SETTINGS")
- `members` → Member.js (JSONB, id = `${guildId}|${memberId}`, indexed on guild_id)
- `users` → User.js (JSONB, id = user.id)
- `member_stats` → MemberStats.js (JSONB, id = `${guildId}|${memberId}`, indexed on guild_id)
- `botconfig` → BotConfig.js (JSONB, id = 'global')
- `giveaways` → Giveaways.js (JSONB, id = messageId) — exports Model object with find/create/updateOne/deleteOne
- `reaction_roles` → ReactionRoles.js (id = `${guildId}|${channelId}|${messageId}`, roles JSONB column)
- `mod_logs` → ModLog.js (BIGSERIAL id, guild_id + member_id indexed columns)
- `automod_logs` → AutomodLogs.js (BIGSERIAL id)
- `translate_logs` → TranslateLog.js (BIGSERIAL id, unique index on 4-column combo)
- `suggestions` → Suggestions.js (BIGSERIAL id, guild_id + message_id indexed)
- `parties` → Party.js (JSONB, id = partyId)

## GuildModel class (Guild.js)
Commands that used `mongoose.model("guild")` directly (for GLOBAL_SETTINGS doc) were updated to import `{ GuildModel }` from Guild.js. `GuildModel` is a class with a static `findOne()` and constructor that adds `.save()`. GLOBAL_SETTINGS is stored in `guilds` table with `id = 'GLOBAL_SETTINGS'`.

## Permission string compatibility (CRITICAL)
Discord.js v13 uses SCREAMING_SNAKE_CASE flags (`ADD_REACTIONS`, `SEND_MESSAGES`) internally. Code written for v14 uses camelCase (`AddReactions`, `SendMessages`) which throws `Invalid bitfield flag`. The `bot.js` shim patches `PermissionFlagsBits` to have the correct BigInt values under camelCase keys.

**Fix applied**: `src/handlers/command.js` has a `resolvePerms()` helper that converts camelCase strings to BigInt values via the shim before calling `.has()`. All inline `.has("CamelCase")` and `deny/allow: ["CamelCase"]` calls across all command/handler/helper files were converted to `PermissionFlagsBits.CamelCase`. Never pass raw camelCase strings to `permissions.has()` or `permissionOverwrites` arrays.

## makeSaveable pattern
```js
const doc = makeSaveable("tableName", primaryKeyValue, plainObject);
doc.fieldName = newValue;
await doc.save(); // snapshots JSON at call time, does upsert
```
The `save` property is `enumerable: false` so it won't appear in JSON.stringify output.

**Why:** AWS DocumentDB was VPC-locked and unreachable from Replit. Replit's built-in PostgreSQL is always accessible.

**How to apply:** Any future schema changes go to the pg-backed files in `src/database/schemas/`. Add new tables to `initDb.js`.
