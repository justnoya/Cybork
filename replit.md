# Discord.js v14 Bot

## Overview
This project is a comprehensive, multipurpose Discord bot built with Discord.js v14, offering extensive functionality across administration, moderation, economy, music, giveaways, invites, statistics, tickets, auto-moderation, anime reactions, image manipulation, and general utilities. It features a modular command system supporting both prefix and slash commands. The bot is designed as a production-ready solution with optional web dashboard support, extensive configuration, and robust error handling. Key capabilities include a highly upgraded Pinterest scraper, modern music player with professional audio effects and advanced lyrics system, and a robust antinuke security suite.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Framework
- **Discord.js v14**: Primary Discord API wrapper.
- **Node.js**: Runtime environment (minimum v18.0.0).
- **Module Alias System**: Path aliasing for cleaner imports (e.g., `@helpers`).

### Command Architecture
- **Dual Command System**: Supports both prefix and slash commands/context menus.
- **Command Structure**: Centralized definitions in `src/commands/` organized by category.
- **Interactive Components**: Modern UI with buttons, modals, select menus, and pagination.
- **Interaction Router**: Centralized component routing with namespaced custom IDs.
- **Custom Aliases**: Server-specific command aliases.

### Database Layer
- **MongoDB with Mongoose**: Primary data persistence with separate schemas for guild settings, user data, moderation logs, giveaways, reaction roles, etc.
- **Backward-Compatible Migrations**: Automatic schema migrations preserve legacy data.

### Feature Specifications
- **Admin Systems**: Autorole, Welcome/Greet, Automod (rule-based protection), Logging.
- **Music System**: Professional Lavalink-based player with Components V2 UI, Spotify integration, advanced audio effects (Bassboost, Karaoke, 8D Audio, Nightcore, Vaporwave, Tremolo, Distortion), and dual-API lyrics system (LRCLIB, lyrics.ovh).
- **Economy**: Coin-based system with daily rewards, begging, gambling.
- **Moderation**: Standard actions (kick, ban, timeout, warn, purge), channel control (lock/unlock), role-based muting, interactive audit logs.
- **Security**: Complete antinuke protection suite with 11 commands, configurable modules, whitelisting, auto-recovery, and punishment system.
- **Tickets**: Multi-category support with transcripts.
- **Giveaways**: Modern professional UI with ContainerBuilder design, toggle between modern/classic views, interactive setup.
- **Server Utilities**: Commands to change server icon (`spfp`) and name (`sname`).
- **Other Features**: Invite tracking, statistics/leveling, reaction roles, translation, counter channels.

### System Design Choices
- **Web Dashboard (Optional)**: Express.js with EJS, `express-session`, and Discord OAuth2 for a web-based configuration interface.
- **Centralized Handlers**: For events, commands, interactions, presence updates, etc.
- **Caching Strategy**: Configurable cache sizes for various Discord entities.
- **Error Handling & Logging**: Pino logger with optional webhook reporting and global unhandled rejection catching.
- **Extension System**: Discord.js Extenders for custom prototype methods.
- **Configuration Management**: Environment variables for sensitive data, central config file for features/embed colors, `emojis.json` for emoji management.
- **UI/UX Decisions**:
    - **Components V2 System**: Utilizes Discord's latest Components V2 for modern, clean message layouts (Container, Text Display, Separator).
    - **ContainerBuilder Helper**: Custom helper class for consistent UI element creation.
    - **Design Patterns**: Clean containers, markdown headers, emoji integration, color-coded accent bars (Blue, Green, Red, Yellow).
    - **ModernEmbed Fallback**: Maintained for commands not yet migrated to Components V2.
    - **Centralized Emoji System**: All bot emojis managed through `emojis.json`.
    - **Music Player UI**: Professional redesign using Components V2 with eye-catching layouts, thumbnail images, dynamic volume bars, and organized button layouts.
    - **Giveaway UI**: Modern professional design with toggle button, supporting both modern (ContainerBuilder) and classic (embed) views.
    - **Pinterest Scraper**: Utilizes Puppeteer for dynamic content loading, stealth plugin for bot detection bypass, and extraction of high-quality images.

## External Dependencies

### Required Services
- **MongoDB**: For persistent data storage.
- **Discord Bot Token**: From Discord Developer Portal.
- **Lavalink Nodes**: For music functionality.

### Optional Services
- **Spotify API**: Client ID and secret for music integration.
- **Discord OAuth2**: Bot secret for dashboard authentication.
- **Error Webhook**: Discord webhook URL for error logging.
- **Weatherstack API**: For weather commands.
- **Strange API**: For image manipulation commands.
- **Pinterest API**: Access token, app ID, and app secret for the `!pfp` command.

### Free Public APIs (No Auth Required)
- **LRCLIB API**: Primary lyrics provider.
- **lyrics.ovh API**: Fallback lyrics provider.

### Key NPM Packages
- `discord.js`, `mongoose`, `lavaclient`, `@lavaclient/queue`, `@lavaclient/spotify`, `discord-giveaways`, `express`, `ejs`, `express-session`, `connect-mongo`, `@vitalets/google-translate-api`, `nekos.life`, `pino`, `pino-pretty`, `sourcebin_js`, `discord-together`.