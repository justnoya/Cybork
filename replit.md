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
- **Listening Parties**: Synchronized music playback across multiple users with shared AudioPlayer, vote-skip system (configurable percentage), party management (create/join/leave/info/end), queue management, and interactive party dashboard with real-time updates.
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
- `discord.js`, `@discordjs/voice`, `mongoose`, `lavaclient`, `@lavaclient/queue`, `@lavaclient/spotify`, `discord-giveaways`, `express`, `ejs`, `express-session`, `connect-mongo`, `@vitalets/google-translate-api`, `nekos.life`, `pino`, `pino-pretty`, `sourcebin_js`, `discord-together`, `play-dl`.

## Recent Changes

### October 29, 2025 - Riffy Integration & Enhanced Music System
Major upgrade to music system with Riffy client integration, enhanced Spotify support, and party invitation system:

**Riffy Migration:**
- **Migrated from Lavaclient to Riffy**: Modern Lavalink client with better stability and features
- **Enhanced Error Handling**: Improved trackStuck and trackError handlers with automatic recovery
- **Spotify Support**: Better Spotify artwork extraction via Lavalink plugin support
- **Reconnection Logic**: Automatic node reconnection with configurable intervals (5s interval, 10 tries)
- **Lavalink v4 Support**: Full support for Lavalink v4 REST API and load types

**Party Invitation System:**
- **Game-Style Invitations**: Party creation now sends beautiful invitation embeds with Join button (similar to Discord game invitations)
- **One-Click Join**: Users can join parties by clicking the Join button on the invitation
- **Visual Feedback**: Professional success messages when joining parties with member count and settings display

**Enhanced Spotify Integration:**
- **Artwork Display**: Improved thumbnail extraction for Spotify tracks via pluginInfo.artworkUrl
- **Better Resolution**: Uses Lavalink's Spotify plugin for native artwork URLs
- **Fallback System**: Multiple fallback methods for artwork retrieval (artworkUrl → thumbnail → pluginInfo → YouTube ID extraction)

**Configuration:**
- **External Lavalink Server**: Uses external production server (vip.visionhost.cloud:2010) for improved stability and performance
- Removed local Lavalink Server workflow to avoid conflicts

**Critical Fixes:**
1. **Voice Connection Timing** (Fixes "playing but no sound" issue):
   - Added proper await for `player.connect()` to ensure voice connection is fully established before playback
   - Implemented connection state validation with polling mechanism to confirm bot is in voice channel
   - Added 500ms stabilization delay for Lavalink voice session to prevent race conditions
   - Connection now validates with 5-second timeout and graceful fallback

2. **Player Error Handling** (Fixes player getting stuck):
   - Enhanced `trackStuck` handler with proper queue state cleanup and user notifications
   - Enhanced `trackException` handler to skip to next track or stop gracefully when queue is empty
   - Added `trackEnd` handler to properly track history for completed tracks
   - All error handlers now include try-catch blocks to prevent cascading failures
   - Player automatically advances queue or stops when errors occur (no more frozen player)

3. **Album Artwork Display** (Fixes missing thumbnails):
   - Completely rewrote `getThumbnailUrl()` method in both MusicPlayerCard.js and MusicPlayerView.js
   - Enhanced YouTube video ID extraction with 5 different methods for maximum compatibility
   - Uses `hqdefault.jpg` (guaranteed to exist) instead of `maxresdefault.jpg` to prevent 404 errors
   - Added support for Spotify artwork via pluginInfo
   - Added SoundCloud artwork extraction from metadata fields
   - Improved logging to debug thumbnail extraction issues
   - Synchronized implementation between card and view helpers for consistency

4. **Party Join Security** (Fixes party channel hijacking):
   - Fixed critical bug where clicking Join button would move the entire party to joiner's voice channel
   - Now validates that user is in the party's existing voice channel before allowing them to join
   - Prevents party disruption for host and existing members
   - Provides clear error messages directing users to join the correct voice channel first
   - Party connection remains stable in original channel throughout member joins

**Technical Improvements:**
- Connection establishment now uses polling with 100ms intervals and 5s timeout
- Error handlers prevent player state corruption when tracks fail
- Thumbnail URLs are validated across multiple metadata fields with priority-based fallback
- All async operations have proper error boundaries
- Improved logging throughout the music playback pipeline

**Impact:**
- ✅ No more "playing but no sound" issues - voice connection is always ready before playback
- ✅ Player never freezes - robust error handling automatically recovers from all error conditions
- ✅ Album artwork displays correctly for YouTube, Spotify, and SoundCloud tracks
- ✅ All music interactions work smoothly without delays or stuck states
- ✅ Connected to production-grade external Lavalink server for better reliability

### October 29, 2025 - Music Player UI Enhancements
Rebuilt the music player interface with improved container-based displays and live status indicators:

**Enhanced Music Player Display:**
- **Now Playing Card in Container**: Visual music cards now display inside a container with controls integrated below
- **Live Status Display**: Real-time status indicators showing Playing/Paused state, loop mode, and volume level
- **Thumbnail Integration**: Song thumbnails properly extracted and displayed in all music views
- **Unified Container UI**: All music commands now use consistent ContainerBuilder interface

**Updated Commands:**
- `/np` (Now Playing): Shows visual music card inside container with live status and controls
- `/play`: Displays enhanced now playing card in container when starting playback
- `/search`: Completely redesigned with ContainerBuilder UI for search results, track selection, and playlist displays
- `/queue`: Already using modern container UI (no changes needed)

**Technical Implementation:**
- New `createNowPlayingWithCard()` method in MusicPlayerView for combined card+container display
- Improved thumbnail extraction using `getThumbnailUrl()` across all displays
- Proper container detection in search command to avoid API payload errors
- Live status badges with emojis for playback state, loop mode, and volume

**UI Improvements:**
- Visual music cards with gradient backgrounds and album artwork
- Status indicators with color-coded badges
- Up Next preview showing upcoming tracks
- Controls integrated within container for cleaner interface
- Consistent purple accent color matching music theme

### October 28, 2025 - Listening Parties Feature
Implemented synchronized listening party system allowing multiple users to listen to music together with perfect synchronization:

**Architecture:**
- **PartyManager** (`src/handlers/partyManager.js`): Manages party lifecycle, members, settings, and voice connections
- **PartyMusicHandler** (`src/handlers/partyMusicHandler.js`): Handles synchronized playback using `@discordjs/voice` with shared AudioPlayer
- **Party Schema** (`src/database/schemas/Party.js`): MongoDB schema for persistent party data
- **Party Interaction Router** (`src/handlers/partyInteractionRouter.js`): Handles interactive buttons (skip votes, queue, info)

**Commands:**
- `/party-create [name]` - Create a new listening party (configurable vote percentage, max members)
- `/party-join <party-id>` - Join an existing party
- `/party-leave` - Leave current party
- `/party-info [party-id]` - View party details and statistics
- `/party-end` - End party (host only)
- `/party-play <song>` - Add and play songs in party (synchronized for all members)
- `/party-skip` - Vote to skip current song

**Key Features:**
- Single AudioPlayer broadcasts to multiple VoiceConnections for perfect sync
- Configurable vote-skip system (default 50%)
- Auto-recovery on disconnections
- Real-time party status updates
- Queue management with party member visibility
- Professional UI using ContainerBuilder with music cards
- Host controls and optional guest controls
- Automatic cleanup for inactive parties

**Technical Details:**
- Uses `play-dl` for YouTube streaming
- Shared AudioPlayer pattern ensures all listeners hear the same timestamp
- Party state persisted in MongoDB
- Event-driven architecture for player state management
- Graceful error handling with fallback mechanisms