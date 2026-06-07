---
name: Console Layout
description: Professional minimal startup UI pattern for this bot — signal protocol, event naming fix, noise suppression
---

## Rule
The `ready` event in Discord.js **v13** is the string `"ready"`. In v14 it is `"clientReady"`. The events loader derives the event name from the filename (`path.basename(file, ".js")`). A file named `clientReady.js` was silently broken in v13 — the handler never fired.

**Fix:** renamed `src/events/clientReady.js` → `src/events/ready.js`.

## Signal Protocol (startup UI)
`start.js` spawns `bot.js` with `stdio: 'pipe'` and filters stdout to ONLY lines matching `/^CYBORK:([A-Z]+):(.+)$/`. All other bot output is suppressed. Key signals emitted:

| Signal | Source file | When |
|--------|-------------|------|
| `CYBORK:COMMANDS:N:M` | `bot.js` after `loadCommands()` | sync, before async |
| `CYBORK:EVENTS:N` | `src/structures/BotClient.js` end of `loadEvents()` | sync |
| `CYBORK:DATABASE:PostgreSQL` | `src/database/initDb.js` after table init | async |
| `CYBORK:ONLINE:tag#1234` | `src/events/ready.js` first line of handler | async |

**Why:** pino logger writes to file only (not stdout). All the "Skipping Command..." / "Loaded X commands" / events table noise came from a mix of console.log and pino output. Replacing with namespaced CYBORK: signals gives clean, parseable stdout.

## Skill location
Full UI code + ANSI helper patterns: `.local/skills/console-layout/SKILL.md`

## Final startup output (example)
```
  CYBORK  CORE
  Discord Infrastructure
  ──────────────────────────────────────────────────
  ✓  system        verified
  ✓  commands      84  ·  64 slash
  ✓  events        24 handlers
  ✓  database      postgresql
  ✓  client        Cybork#2032
  ──────────────────────────────────────────────────
  ✓  ready  ·  4.5s
```
