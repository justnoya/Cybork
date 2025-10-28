# Discord.js v14 Bot

## Overview
This project is a comprehensive, multipurpose Discord bot built with Discord.js v14, offering extensive functionality across administration, moderation, economy, music, giveaways, invites, statistics, tickets, auto-moderation, anime reactions, image manipulation, and general utilities. It features a modular command system supporting both prefix and slash commands. The bot is designed as a production-ready solution with optional web dashboard support, extensive configuration, and robust error handling.

**Recent Update (Oct 28, 2025)**: Completed major system enhancements including:
- **Global Access System**: Converted `noprefix` and `access` commands to work globally across all servers instead of per-server
  - New BotConfig schema stores global user lists
  - Users with global access can use commands without prefix in any server
  - Simplified management with centralized user lists
- **Music Player Modernization**: Complete UI overhaul using Discord Components V2:
  - Professional container-based layouts with purple/blue themes
  - Thumbnail images using HQ quality (not full-size) via media gallery component
  - Visual volume bars and dynamic status indicators
  - Improved organization with markdown headers and emoji hierarchy
  - Modern queue and history displays with better pagination
  - All music displays now use ContainerBuilder for consistency
- **Professional Audio Effects Suite**: Revolutionary music enhancement system:
  - Enhanced bassboost with 6 quality levels (none, low, medium, high, extreme, insane)
  - 6 innovative audio effects no competitors offer: karaoke (vocal removal), 8D (surround sound), nightcore (speed/pitch up), vaporwave (speed/pitch down), tremolo (volume oscillation), distortion (hard rock sound)
  - All effects use Lavalink's professional-grade filters with toggle on/off functionality
  - Professional 5-band equalizer for bassboost with graduated gains (25Hz-160Hz)
- **Advanced Lyrics System**: Complete lyrics integration with professional display:
  - LRCLIB API integration (3M+ lyrics database, free, no auth required)
  - Fallback to lyrics.ovh API for better coverage
  - Auto-detection of currently playing song
  - Empty lyrics validation to prevent misleading displays
  - Professional Container-based UI with metadata (word count, line count, duration)
  - Smart truncation for long lyrics with helpful tips
  - Intelligent artist/title parsing from queries

**Previous Updates**:
- Migration of Welcome/Autorole, Automod, and Logging systems to modern interactive Discord components (buttons, modals, select menus) with centralized interaction routing
- Security fix: Separated noprefix users from developer access with automatic backward-compatible migration
- Custom command aliases system with interactive management UI and validation
- Comprehensive moderation suite: lock/unlock channels, audit log viewer, role-based mute/unmute system
- All owner-only commands now use prefix-only (slash commands disabled for security)
- Full prefix command support for greet and automod commands (supports both prefix and slash command interfaces)
- **Security Category**: Complete antinuke protection suite with 11 commands (antiban, antikick, antirole, antichannel, antibot, antiwebhook, antiemoji, antiguild-update, antieveryone, autorecovery, antinuke) - all support both prefix and slash modes
- **Server Utilities**: New `spfp` and `sname` commands for changing server icon and name with modern UI
- **Modern Giveaway UI**: Professional giveaway embeds with toggle button to switch between modern (ContainerBuilder) and classic (embed) views, featuring server icon, markdown styling, and beautiful formatting
- **PFP Command Fix**: Resolved "Expected a string primitive" error with proper string validation in PinterestScraper
- **UI Component Upgrade (Oct 25, 2025)**: Comprehensive admin UI modernization:
  - All embeds/containers now use consistent white color (0xFFFFFF) throughout the system
  - Enhanced EmojiManager with 60-second cache to prevent repeated file reads and improve performance
  - Complete rewrite of greet, automod, autorole handlers with modern string select menus for channel/role selection
  - New antinuke handler with user/channel select menus, modal configuration, and preset security profiles
  - All admin handlers now use emojis from centralized emojis.json configuration
  - Fixed slow button interactions in autorole enable/disable functionality
  - Optimized interaction handling with proper error recovery and user feedback
  - Event-based interaction routing for admin components bypassing router context for better performance

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Framework
- **Discord.js v14**: Primary Discord API wrapper.
- **Node.js**: Runtime environment (minimum v18.0.0).
- **Module Alias System**: Path aliasing for cleaner imports (e.g., `@helpers`, `@schemas`).

### Command Architecture
- **Dual Command System**: Supports both prefix and slash commands/context menus.
- **Command Structure**: Centralized definitions in `src/commands/` organized by category.
- **Command Validation**: Built-in system for permissions, cooldowns, and arguments.
- **Context Menus**: User and message context menu support.
- **Interactive Components**: Modern UI with buttons, modals, select menus, and pagination.
- **Interaction Router**: Centralized component routing with namespaced custom IDs (format: `category:action:data`).
- **Custom Aliases**: Server-specific command aliases with interactive management (max 50 per server).

### Database Layer
- **MongoDB with Mongoose**: Primary data persistence with separate schemas for guild settings, user data, moderation logs, giveaways, reaction roles, etc.
- **Backward-Compatible Migrations**: Automatic schema migrations preserve legacy data (e.g., noprefix users from developers array).

### Feature Modules
- **Admin Systems**: 
  - **Autorole** (`/autorole` or `!autorole`): Separate bot/human autoroles with interactive management
  - **Welcome/Greet** (`/greet` or `!greet`): Multi-channel support, auto-delete, embed customization, 7 subcommands with full prefix support
  - **Automod** (`/automod` or `!automod`): Rule-based protection (antispam, antilink, antibadwords, antizalgo, anticaps) with channel whitelisting and full prefix support
  - **Logging** (7 commands): Comprehensive event logging (channels, members, messages, moderation, roles)
- **Music System**: Professional Lavalink-based player with Spotify-quality UI and advanced features:
  - Modern Components V2 UI with professional "Enqueued Track" and "Now Playing" displays
  - Queue management with pagination and thumbnail support
  - Spotify integration for track search and playback
  - Professional audio effects suite:
    - **Bassboost**: 6 quality levels (none to insane) with 5-band EQ (25Hz-160Hz)
    - **Karaoke**: Vocal removal for sing-along mode
    - **8D Audio**: Immersive surround sound experience
    - **Nightcore**: Speed up + pitch up (1.3x) for high-energy tracks
    - **Vaporwave**: Slow down + pitch down (0.8x) for chill vibes
    - **Tremolo**: Volume oscillation effect (4Hz frequency)
    - **Distortion**: Hard rock sound with scale adjustment
  - Advanced lyrics system with dual-API fallback (LRCLIB + lyrics.ovh)
  - Professional metadata displays and error handling
  - All effects toggle independently with visual feedback
- **Economy**: Coin-based system with daily rewards, begging, gambling
- **Moderation**: 
  - Standard actions: Kick, ban, timeout, warn, purge with mod logs
  - Channel control: Lock/unlock channels
  - Role-based muting: Mute/unmute with automatic "Muted" role creation
  - Audit logs: Interactive audit log viewer with filters and pagination (`/audit`)
- **Security**: 
  - Complete antinuke protection suite with 11 commands
  - Configurable protection modules (ban, kick, role, channel, bot, webhook, emoji, guild settings, @everyone)
  - Whitelist system for trusted users
  - Auto-recovery for channel/role deletions
  - Punishment system (ban, kick, strip roles)
  - All commands support both prefix and slash modes
- **Tickets**: Multi-category support with transcripts
- **Giveaways**: 
  - Modern professional UI with ContainerBuilder design
  - Toggle button to switch between modern and classic views
  - Server icon integration
  - Interactive setup with modals
  - Custom reaction emoji support
- **Server Utilities**:
  - `spfp`: Change server icon with image URL or attachment
  - `sname`: Change server name with validation
- **Other Features**: Invite tracking, statistics/leveling, reaction roles, translation, counter channels

### Web Dashboard (Optional)
- **Express.js**: Web server framework with EJS templates, `express-session` for session management with MongoDB store, and Discord OAuth2 for authentication, providing a web-based configuration interface.

### Handlers & Middleware
- **Centralized Handlers**: For events, commands, interactions, presence updates, counter channels, reaction roles, stats, and greetings.

### Caching Strategy
- **Configurable Cache Sizes**: Separate limits for guilds, users, members, invites, cooldowns, and antispam.

### Error Handling & Logging
- **Pino Logger**: Structured logging with optional webhook reporting and global unhandled rejection catching.

### Extension System
- **Discord.js Extenders**: Custom methods added to Discord.js prototypes (Message, Guild, GuildChannel).

### Configuration Management
- **Environment Variables**: For sensitive data (`.env`).
- **Config File**: Centralized configuration for features, embed colors, and cache sizes.
- **Emoji Configuration**: Centralized emoji management via `emojis.json` with runtime reload capability.

### UI/UX Decisions
- **Components V2 System**: Utilizes Discord's latest Components V2 for modern, clean message layouts, including Container, Text Display, and Separator components.
- **ContainerBuilder Helper**: Custom helper class for consistent UI element creation, supporting accent colors, text displays, separators, and action rows.
- **Message Flags**: Container-based interaction responses use flag `1 << 15` (IS_COMPONENTS_V2) - only for interaction responses, not channel messages.
- **Interactive Components**: Action rows with buttons/select menus are positioned below containers.
- **Design Patterns**: Clean containers, markdown headers, emoji integration, and color-coded accent bars (Blue for info, Green for success, Red for error, Yellow for warning).
- **ModernEmbed Fallback**: Maintained for commands not yet migrated to Components V2.
- **No ASCII Decorations**: Replaced with native Discord markdown and component layouts.
- **Centralized Emoji System**: All bot emojis managed through `emojis.json` config file with owner commands for runtime management.
- **Music Player UI**: Modern professional redesign using Components V2 containers with:
  - Eye-catching layouts with purple/blue accent colors
  - Thumbnail images (HQ quality, not full-size) displayed via media gallery component
  - Dynamic volume bars with visual indicators
  - Clean markdown formatting with emojis for better visual hierarchy
  - Professional now playing display with track info, status, and up-next preview
  - Modern queue/history views with pagination
  - Organized button layouts for all player controls
  - ContainerBuilder-based UI for consistency across all music displays
- **Giveaway UI**: Modern professional design with toggle button, supporting both modern (ContainerBuilder with markdown) and classic (embed) views, featuring server name integration and beautiful formatting.

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
- **LRCLIB API**: Primary lyrics provider (3M+ lyrics database, free, reliable).
- **lyrics.ovh API**: Fallback lyrics provider for broader coverage.

### Key NPM Packages
- `discord.js`: Discord API interaction.
- `mongoose`: MongoDB ODM.
- `lavaclient`, `@lavaclient/queue`, `@lavaclient/spotify`: Music player and Spotify integration.
- `discord-giveaways`: Giveaway management.
- `express`, `ejs`, `express-session`, `connect-mongo`: Web dashboard.
- `@vitalets/google-translate-api`: Translation service.
- `nekos.life`: Anime reactions API.
- `pino`, `pino-pretty`: Logging.
- `sourcebin_js`: Ticket transcript hosting.
- `discord-together`: Discord Activities integration.