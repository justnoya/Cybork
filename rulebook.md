## 1. Message Components V2 Architecture
This bot uses Discord's modern **Components V2** (Containers) for its primary UI/UX.

### Core Structure: `ContainerBuilder`
Always use the `ContainerBuilder` helper class located in `src/helpers/ContainerBuilder.js` to construct messages.

- **Flag**: All V2 messages must include `flags: 32768` (COMPONENTS_V2_FLAG).
- **Layout Hierarchy**:
  - **Root**: A message payload containing a `components` array.
  - **Containers**: Objects with `type: 17`. Each container can have an `accent_color`.
  - **Sub-components**: Elements inside a container's `components` array.
    - `TextDisplay` (`type: 10`): Main text content. Supports Markdown (Headers, bold, etc.).
    - `Separator` (`type: 14`): Visual horizontal line.
    - `MediaGallery` (`type: 12`): For images/thumbnails.

### Common Components
- **Buttons**: Standard Discord buttons (`type: 2`) should be placed in an `ActionRow` (`type: 1`) outside or inside containers depending on the design.
- **Select Menus**: Used for navigation (e.g., `help-menu`).

## 2. Design Principles
- **Professional Tone**: Use "Audio Engine", "Security Audit", "System Initialization", and "Operational" instead of casual terms.
- **Visual Consistency**:
  - Use `0x2B2D31` (Dark Gray) as the default `accentColor`.
  - Use specific colors for states: `0x43B581` (Success), `0xF04747` (Error), `0xFAA61A` (Warning), `0x5865F2` (Blurple).
- **Content Organization**:
  - Header 1 (`#`) for main titles.
  - Header 2 (`##`) for section titles.
  - Bold (`**`) for labels.
  - Code blocks or ANSI escape codes for technical data/usage.

## 3. Interaction Routing
- **Pattern**: `category:action:data` (e.g., `music:pause:guildId`).
- **Router**: All component interactions (buttons, menus) must be routed through `InteractionRouter` in `src/handlers/interactionRouter.js`.
- **Registration**: Register new handlers using `client.interactionRouter.registerComponent(category, action, handler)`.

## 4. Music Player Design
- **Now Playing Display**: 
  - Uses `MusicPlayerCard` (Canvas-based image) as the primary visual.
  - Accompanied by two `ActionRow`s of buttons for playback control.
  - Fallback to `MusicPlayerView` (Container-based) if image generation fails.

## 5. Directory Structure & Organization
- **Commands**: Organized by category (e.g., `src/commands/utility/`, `src/commands/social/music/`).
- **Handlers**: Core logic for events, music, and interactions (e.g., `src/handlers/`).
- **Helpers**: Utility classes and UI builders (e.g., `src/helpers/ContainerBuilder.js`).
- **Processors**: High-performance task management (e.g., `src/processors/`).

## 6. Development Standards
- **Logging**: Use `client.logger` (`Logger.js`) with appropriate levels: `log`, `success`, `warn`, `error`.
- **Validation**: Validate all command configurations using the existing validation logic in `BotClient`.
- **Performance**: Use `Processors` (`src/processors/`) for heavy tasks like searching, caching, or queue management.
