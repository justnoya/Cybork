---
name: Discord.js v13 Compatibility Fixes
description: Critical bugs that make the bot appear to start but silently swallow all command responses
---

## The Rules

1. **`guild.members.me` → `guild.me || guild.members?.me`**  
   `guild.members.me` is v14-only. In v13 it is `undefined`. Any permission check using it returns 0 permissions, causing silent early returns in `safeReply`, `safeSend`, `canSendEmbeds`.

2. **`PermissionFlagsBits` polyfill required**  
   Does not exist in djs v13. Must be added in `bot.js` before command handler loads, or every `handlePrefixCommand` call throws `TypeError: Cannot read properties of undefined`.

3. **`ChannelType` comparison: strings vs numbers**  
   In v13 `channel.type` is a string (`'GUILD_TEXT'`). In v14 it is a number. Polyfill sets numeric values so `channel.type !== ChannelType.GuildText` is always true in v13 — blocks `safeSend` entirely. Must check both string and numeric forms.

4. **Duplicate event files — both load and both fire**  
   `recursiveReadDirSync` walks all subdirs. If `src/events/messageCreate.js` AND `src/events/message/messageCreate.js` both exist, both register as listeners and fire on every message (commands run twice). Same for `interactionCreate.js`. Neutralize duplicates with a no-op export.

**Why:** These are all the result of the codebase being written for djs v14 but running on v13.17.1. The polyfills in bot.js only cover `ApplicationCommandOptionType` and `ChannelType` — the extenders and handlers also use v14 API.

**How to apply:** Any time a command appears to "not respond" after startup succeeds, check these four items first. The bot will log in and load fine — the failures are all silent returns, not crashes.
