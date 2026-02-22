# Discord.js v14 Bot

## Overview
This project is a comprehensive, multipurpose Discord bot built with Discord.js v14, offering extensive functionality across administration, moderation, economy, music, giveaways, invites, statistics, tickets, auto-moderation, anime reactions, image manipulation, and general utilities. It features a modular command system supporting both prefix and slash commands. The bot is designed as a production-ready solution with optional web dashboard support, extensive configuration, and robust error handling. Key capabilities include a highly upgraded Pinterest scraper, a modern music player with professional audio effects and an advanced lyrics system, and a robust antinuke security suite.

## User Preferences
Preferred communication style: Simple, everyday language.

## Project Architecture
Refer to `rulebook.md` for detailed UI/UX design patterns, message component standards, and interaction routing architecture.

### Core Framework
- **Discord.js v14**: Primary Discord API wrapper.
- **Components V2**: Advanced message container system for modern UI.
- **Interaction Router**: Centralized namespaced event handling.

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
- **Admin Systems**: Autorole, Welcome/Greet, Automod (rule-based protection), Logging. All use modern Discord SelectMenus instead of modals for better UX.
- **Music System**: Enterprise-grade `discord-player v7` system optimized for 50-100+ concurrent servers with crystal-clear audio, Components V2 UI, multi-platform support (YouTube, Spotify, SoundCloud, Apple Music), advanced audio effects (Bassboost, Karaoke, 8D Audio, Nightcore, Vaporwave, Tremolo, Distortion), dual-API lyrics system (LRCLIB, lyrics.ovh), and FFmpeg-powered professional audio processing. Includes synchronized listening parties with shared AudioPlayer, vote-skip, and real-time updates.
- **Economy**: Coin-based system with daily rewards, begging, gambling.
- **Moderation**: Standard actions (kick, ban, timeout, warn, purge), channel control (lock/unlock), role-based muting, interactive audit logs.
- **Security**: Complete antinuke protection suite with 11 commands, configurable modules, whitelisting, auto-recovery, and punishment system. Includes comprehensive Security Setup Wizard with modern components.
- **Tickets**: Multi-category support with transcripts.
- **Giveaways**: Modern professional UI with ContainerBuilder design, toggle between modern/classic views, interactive setup. Includes attachment support for bug reports.
- **Server Utilities**: Commands to change server icon (`spfp`) and name (`sname`).
- **Pinterest Scraper**: Fully functional `/pfp` command with Puppeteer integration for aesthetic profile pictures. Includes stealth plugin, duplicate detection, caching system, and graceful fallback.
- **Advanced Processor System**: High-performance architecture for handling 200+ servers with queue management, intelligent caching, web search, performance monitoring, and data processing utilities.
- **Other Features**: Invite tracking, statistics/leveling, reaction roles, translation, counter channels.

### System Design Choices
- **Web Dashboard (Optional)**: Express.js with EJS, `express-session`, and Discord OAuth2 for a web-based configuration interface.
- **Centralized Handlers**: For events, commands, interactions, presence updates, etc.
- **Caching Strategy**: Multi-tier caching with ProcessorManager's intelligent cache (50K items, LRU eviction, TTL support).
- **Error Handling & Logging**: Pino logger with optional webhook reporting and global unhandled rejection catching.
- **Extension System**: Discord.js Extenders for custom prototype methods.
- **Configuration Management**: Environment variables for sensitive data, central config file for features/embed colors, `emojis.json` for emoji management.
- **Advanced Processors** (`src/processors/`):
    - **QueueProcessor**: Priority-based task queue with 50 concurrent workers, rate limiting (200 tasks/sec), automatic retry with exponential backoff.
    - **CacheProcessor**: Intelligent LRU cache with TTL, 50K item capacity, automatic cleanup, batch operations.
    - **SearchProcessor**: Free web search via Wikipedia & DuckDuckGo APIs (no keys required), result caching, rate limiting.
    - **PerformanceProcessor**: Real-time monitoring of CPU, memory, event loop; automatic health checks and optimization recommendations.
    - **DataProcessor**: High-performance utilities for batch processing, parallel operations, data transformation.
    - **ProcessorManager**: Unified facade exposing all processors via `client.processors` for easy access.
- **UI/UX Decisions**:
    - **Components V2 System**: Utilizes Discord's latest Components V2 for modern, clean message layouts (Container, Text Display, Separator).
    - **Modern Select Menus**: Admin commands (greet, automod, autorole) use ChannelSelectMenu and RoleSelectMenu instead of modals.
    - **ContainerBuilder Helper**: Custom helper class for consistent UI element creation.
    - **Design Patterns**: Clean containers, markdown headers, emoji integration, color-coded accent bars (Blue, Green, Red, Yellow).
    - **ModernEmbed Fallback**: Maintained for commands not yet migrated to Components V2.
    - **Centralized Emoji System**: All bot emojis managed through `emojis.json`.
    - **Music Player UI**: Professional redesign using Components V2 with eye-catching layouts, thumbnail images, dynamic volume bars, and organized button layouts.
    - **Giveaway UI**: Modern professional design with toggle button, supporting both modern (ContainerBuilder) and classic (embed) views.
    - **Pinterest Scraper**: Puppeteer-based scraper with stealth plugin, optimized timeouts (60s), smart error handling, duplicate detection via MD5 hashing, and graceful fallback system.

## External Dependencies

### Required Services
- **MongoDB**: For persistent data storage.
- **Discord Bot Token**: From Discord Developer Portal.

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
- **Wikipedia API**: Free encyclopedia search for `/search` command.
- **DuckDuckGo Instant Answer API**: Free web search with fallback support.

### Key NPM Packages
- `discord.js`, `@discordjs/voice`, `mongoose`, `discord-player`, `@discord-player/extractor`, `discord-giveaways`, `express`, `ejs`, `express-session`, `connect-mongo`, `@vitalets/google-translate-api`, `nekos.life`, `pino`, `pino-pretty`, `sourcebin_js`, `discord-together`, `play-dl`.