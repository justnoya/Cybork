# Discord Bot Design Rulebook

## 📋 Table of Contents
1. [Container Update Pattern](#container-update-pattern)
2. [Component Design Patterns](#component-design-patterns)
3. [Navigation Rules](#navigation-rules)
4. [Code Formation Standards](#code-formation-standards)
5. [Examples & Best Practices](#examples--best-practices)

---

## 🎯 Container Update Pattern

### Core Principle
**NEVER create new ephemeral messages for sub-panels. ALWAYS update the main container.**

### The Problem
```javascript
// ❌ WRONG - Creates new message, causes "Unknown interaction" errors
async function handleButton(interaction, settings) {
  await interaction.reply({ ...payload, ephemeral: true }); // BAD!
}
```

This pattern causes two critical errors:
1. **DiscordAPIError[10062]: Unknown interaction** - Original interaction expires
2. **DiscordAPIError[50035]: Invalid Form Body** - Content field conflicts with Components V2

### The Solution
```javascript
// ✅ CORRECT - Updates main container
async function handleButton(interaction, source, isInteraction, settings) {
  await interaction.deferUpdate(); // Acknowledge immediately
  await showSubPanel(source, isInteraction, settings); // Update main container
}

async function showSubPanel(source, isInteraction, settings) {
  // Build components
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0xFFFFFF, components: components })
    .build();
  
  await source.editReply(payload); // Update the MAIN message
  setupCollector(source, isInteraction, settings); // Setup new collector
}
```

---

## 🏗️ Component Design Patterns

### 1. Main Panel Structure
```javascript
async function showMainPanel(source, isInteraction, settings, isInitial = false) {
  const components = [];
  
  // Header
  components.push(ContainerBuilder.createTextDisplay("# 🎯 Feature Name"));
  components.push(ContainerBuilder.createSeparator());
  
  // Status Information
  components.push(ContainerBuilder.createTextDisplay("## Current Status"));
  components.push(ContainerBuilder.createTextDisplay(`**Setting:** ${value}`));
  
  components.push(ContainerBuilder.createSeparator());
  
  // Action Buttons
  const buttonRow = InteractionUtils.createButtonRow([
    { customId: "feature_option1", label: "Option 1", emoji: "🔧", style: ButtonStyle.Secondary },
    { customId: "feature_option2", label: "Option 2", emoji: "⚙️", style: ButtonStyle.Secondary },
  ]);
  components.push(buttonRow);
  
  // Build and send
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0xFFFFFF, components: components })
    .build();
  
  const msg = isInteraction
    ? await source.editReply(payload)
    : await source.safeReply(payload);
  
  // Only setup collector on initial load
  if (isInitial) {
    setupMainCollector(msg, source, isInteraction, settings);
  }
}
```

### 2. Sub-Panel Structure
```javascript
async function showSubPanel(source, isInteraction, settings) {
  const components = [];
  
  // Header
  components.push(ContainerBuilder.createTextDisplay("# 🔧 Sub-Panel Name"));
  components.push(ContainerBuilder.createSeparator());
  
  // Content
  components.push(ContainerBuilder.createTextDisplay("Configuration content here"));
  components.push(ContainerBuilder.createSeparator());
  
  // Action Buttons + ALWAYS include Back button
  const buttonRow = InteractionUtils.createButtonRow([
    { customId: "sub_enable", label: "Enable", emoji: "🟢", style: ButtonStyle.Success },
    { customId: "sub_back", label: "Back", emoji: "◀️", style: ButtonStyle.Secondary },
  ]);
  components.push(buttonRow);
  
  // Build and update MAIN container
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0xFFFFFF, components: components })
    .build();
  
  await source.editReply(payload); // Update main container
  
  // Setup sub-panel collector
  setupSubPanelCollector(source, isInteraction, settings);
}
```

---

## 🧭 Navigation Rules

### Rule 1: Back Buttons Are Mandatory
**Every sub-panel MUST have a back button to return to the main panel.**

```javascript
const backButton = InteractionUtils.createButtonRow([{
  customId: "feature_back", // Format: {feature}_{action}
  label: "Back",
  emoji: "◀️",
  style: ButtonStyle.Secondary,
}]);
```

### Rule 2: Auto-Return After State Changes
**After enabling/disabling/saving, automatically return to main panel after showing success message.**

```javascript
// After saving settings
await interaction.deferUpdate();
collector.stop();

// Show success message
const successComponents = [];
successComponents.push(ContainerBuilder.createTextDisplay(
  `# ${getEmoji("success")} Settings Updated!\n\nReturning to main panel...`
));
const payload = new ContainerBuilder()
  .addContainer({ accentColor: 0x00FF00, components: successComponents })
  .build();

await source.editReply(payload);

// Auto-return after 2 seconds
setTimeout(() => showMainPanel(source, isInteraction, settings, false), 2000);
```

### Rule 3: Collector Management
```javascript
function setupCollector(source, isInteraction, settings) {
  const message = isInteraction ? source : source.channel;
  const userId = isInteraction ? source.user.id : source.author.id;
  
  const collector = message.createMessageComponentCollector({
    filter: (i) => i.user.id === userId,
    time: 60000, // 1 minute timeout for sub-panels, 5 minutes for main
  });
  
  collector.on("collect", async (interaction) => {
    try {
      if (interaction.customId === "feature_enable") {
        await interaction.deferUpdate(); // ALWAYS defer first
        // Handle logic
        collector.stop(); // Stop collector after action
        // Update UI and auto-return
      } else if (interaction.customId === "feature_back") {
        await interaction.deferUpdate();
        collector.stop();
        await showMainPanel(source, isInteraction, settings, false);
      }
    } catch (error) {
      console.error("Collector error:", error);
      collector.stop();
    }
  });
  
  collector.on("end", (collected, reason) => {
    // Auto-return to main on timeout
    if (reason === "time") {
      showMainPanel(source, isInteraction, settings, false).catch(() => {});
    }
  });
}
```

---

## 📝 Code Formation Standards

### File Structure
```
src/commands/{category}/{command}.js
│
├── Module Exports (Command Definition)
├── showMainPanel() - Main panel UI
├── setupMainCollector() - Main panel collector
├── showSubPanel1() - Sub-panel UIs
├── setupSubPanel1Collector() - Sub-panel collectors
├── handleModalSubmit() - Modal handlers
└── Helper Functions
```

### Naming Conventions
```javascript
// Panel Functions
showMainPanel()         // Main panel
showChannelManager()    // Sub-panel
showEmbedSettings()     // Sub-panel

// Collector Functions
setupMainCollector()
setupChannelManagerCollector()
setupEmbedSettingsCollector()

// Handler Functions
handleMessage()         // Modal submission
handleTest()           // Direct action
handleToggle()         // State toggle

// Custom IDs
"{feature}_{action}"           // Button: greet_channels, automod_antispam
"{feature}_{action}_back"      // Back button: greet_channels_back
"{feature}_{action}_toggle_{state}" // Toggle: embed_toggle_true
```

### Component Reusability
```javascript
// Use ContainerBuilder for all UI
const components = [];
components.push(ContainerBuilder.createTextDisplay("# Header"));
components.push(ContainerBuilder.createSeparator());
components.push(ContainerBuilder.createTextDisplay("Content"));

// Use InteractionUtils for buttons
const buttons = InteractionUtils.createButtonRow([
  { customId: "id", label: "Label", emoji: "🎯", style: ButtonStyle.Primary }
]);

// Use InteractionUtils for modals
const modal = InteractionUtils.createModal("modal_id", "Title", [
  { customId: "input", label: "Label", style: TextInputStyle.Short, required: true }
]);
```

---

## 💡 Examples & Best Practices

### Complete Command Template
```javascript
const { ComponentType, ButtonStyle, TextInputStyle } = require("discord.js");
const ContainerBuilder = require("@helpers/ContainerBuilder");
const InteractionUtils = require("@helpers/InteractionUtils");
const { getEmoji, statusEmoji } = require("@helpers/EmojiUtils");

module.exports = {
  name: "feature",
  description: "Feature description",
  category: "CATEGORY",
  userPermissions: ["ManageGuild"],
  command: { enabled: true },
  slashCommand: { enabled: true, ephemeral: true },

  async messageRun(message, args, data) {
    await showMainPanel(message, false, data.settings, true);
  },

  async interactionRun(interaction, data) {
    await interaction.deferReply({ ephemeral: true });
    await showMainPanel(interaction, true, data.settings, true);
  },
};

async function showMainPanel(source, isInteraction, settings, isInitial = false) {
  // Build UI
  const components = [];
  components.push(ContainerBuilder.createTextDisplay("# 🎯 Feature Name"));
  components.push(ContainerBuilder.createSeparator());
  
  const buttonRow = InteractionUtils.createButtonRow([
    { customId: "feature_config", label: "Configure", emoji: "⚙️", style: ButtonStyle.Secondary },
  ]);
  components.push(buttonRow);
  
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0xFFFFFF, components: components })
    .build();
  
  const msg = isInteraction
    ? await source.editReply(payload)
    : await source.safeReply(payload);
  
  if (isInitial) {
    setupMainCollector(msg, source, isInteraction, settings);
  }
}

function setupMainCollector(message, source, isInteraction, settings) {
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === (isInteraction ? source.user.id : source.author.id),
    time: 300000,
  });
  
  collector.on("collect", async (interaction) => {
    try {
      if (interaction.customId === "feature_config") {
        await interaction.deferUpdate();
        await showConfigPanel(source, isInteraction, settings);
      }
    } catch (error) {
      console.error("Collector error:", error);
    }
  });
  
  collector.on("end", () => {
    if (message && message.components) {
      message.edit({
        components: InteractionUtils.disableComponents(message.components)
      }).catch(() => {});
    }
  });
}

async function showConfigPanel(source, isInteraction, settings) {
  const components = [];
  components.push(ContainerBuilder.createTextDisplay("# ⚙️ Configuration"));
  components.push(ContainerBuilder.createSeparator());
  
  const buttonRow = InteractionUtils.createButtonRow([
    { customId: "config_enable", label: "Enable", emoji: "🟢", style: ButtonStyle.Success },
    { customId: "config_back", label: "Back", emoji: "◀️", style: ButtonStyle.Secondary },
  ]);
  components.push(buttonRow);
  
  const payload = new ContainerBuilder()
    .addContainer({ accentColor: 0xFFFFFF, components: components })
    .build();
  
  await source.editReply(payload);
  setupConfigCollector(source, isInteraction, settings);
}

function setupConfigCollector(source, isInteraction, settings) {
  const message = isInteraction ? source : source.channel;
  const userId = isInteraction ? source.user.id : source.author.id;
  
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === userId,
    time: 60000,
  });
  
  collector.on("collect", async (interaction) => {
    try {
      if (interaction.customId === "config_enable") {
        await interaction.deferUpdate();
        
        // Save settings
        settings.feature = { enabled: true };
        await settings.save();
        
        collector.stop();
        
        // Show success and auto-return
        const components = [];
        components.push(ContainerBuilder.createTextDisplay(
          `# ${getEmoji("success")} Feature Enabled!\n\nReturning to main panel...`
        ));
        const payload = new ContainerBuilder()
          .addContainer({ accentColor: 0x00FF00, components: components })
          .build();
        
        await source.editReply(payload);
        setTimeout(() => showMainPanel(source, isInteraction, settings, false), 2000);
        
      } else if (interaction.customId === "config_back") {
        await interaction.deferUpdate();
        collector.stop();
        await showMainPanel(source, isInteraction, settings, false);
      }
    } catch (error) {
      console.error("Config collector error:", error);
      collector.stop();
    }
  });
  
  collector.on("end", (collected, reason) => {
    if (reason === "time") {
      showMainPanel(source, isInteraction, settings, false).catch(() => {});
    }
  });
}
```

---

## ✅ Checklist for Every Command

- [ ] Main panel has `isInitial` parameter
- [ ] All button handlers use `await interaction.deferUpdate()`
- [ ] Sub-panels update main container with `source.editReply()`
- [ ] Every sub-panel has a back button
- [ ] After enabling/saving, show success and auto-return to main (2s delay)
- [ ] Collectors are stopped before navigation
- [ ] Timeout returns to main panel
- [ ] No `interaction.reply({ ephemeral: true })` in sub-panels
- [ ] Custom IDs follow naming convention: `{feature}_{action}`
- [ ] Error handling doesn't create new messages

---

## 🚫 Common Mistakes to Avoid

### 1. Creating New Messages
```javascript
// ❌ WRONG
await interaction.reply({ ...payload, ephemeral: true });

// ✅ CORRECT
await interaction.deferUpdate();
await source.editReply(payload);
```

### 2. Forgetting to Stop Collectors
```javascript
// ❌ WRONG
if (interaction.customId === "feature_enable") {
  // Handle action but don't stop collector
  await showMainPanel(...);
}

// ✅ CORRECT
if (interaction.customId === "feature_enable") {
  await interaction.deferUpdate();
  collector.stop(); // Always stop!
  await showMainPanel(...);
}
```

### 3. Missing Back Buttons
```javascript
// ❌ WRONG - No way to return
const buttonRow = InteractionUtils.createButtonRow([
  { customId: "feature_enable", label: "Enable", ... },
]);

// ✅ CORRECT - Always include back
const buttonRow = InteractionUtils.createButtonRow([
  { customId: "feature_enable", label: "Enable", ... },
  { customId: "feature_back", label: "Back", emoji: "◀️", style: ButtonStyle.Secondary },
]);
```

### 4. Not Auto-Returning After Actions
```javascript
// ❌ WRONG - User is stuck on success screen
await settings.save();
await response.update({ content: "✅ Saved!" });

// ✅ CORRECT - Auto-return to main
await settings.save();
const payload = // ... success message
await source.editReply(payload);
setTimeout(() => showMainPanel(source, isInteraction, settings, false), 2000);
```

---

## 🎨 UI/UX Guidelines

### Color Scheme
```javascript
// Main panels - White/Neutral
accentColor: 0xFFFFFF

// Success messages - Green
accentColor: 0x00FF00

// Error messages - Red
accentColor: 0xFF0000

// Warning messages - Yellow
accentColor: 0xFFFF00
```

### Status Indicators
```javascript
// Use statusEmoji for enabled/disabled
const status = feature.enabled 
  ? `${statusEmoji(true)} **Active**` 
  : `${statusEmoji(false)} Disabled`;

// Use getEmoji for actions
`${getEmoji("success")} Operation completed!`
`${getEmoji("error")} Operation failed!`
```

### Button Styles
```javascript
// Enable actions - Success (Green)
style: ButtonStyle.Success

// Disable actions - Danger (Red)
style: ButtonStyle.Danger

// Configuration/Settings - Secondary (Gray)
style: ButtonStyle.Secondary

// Primary actions - Primary (Blue)
style: ButtonStyle.Primary
```

---

## 📚 Reference Commands

### Fully Implemented Examples
1. **greet.js** - Complete container update pattern with all features
   - Channel selection with back button
   - Auto-return after save
   - Modal handling
   - Variables panel

2. **automod.js** - Should follow same pattern (to be refactored)
3. **antinuke.js** - Should follow same pattern (to be refactored)

### Key Differences from Old Pattern
| Old Pattern | New Pattern |
|------------|-------------|
| `interaction.reply({ ephemeral: true })` | `interaction.deferUpdate()` + `source.editReply()` |
| New message per sub-panel | Update main container |
| No back buttons | Mandatory back buttons |
| User must manually close | Auto-return after actions |
| Collectors never stopped | Always stop before navigation |

---

## 🔄 Migration Guide

### Converting Old Commands to New Pattern

1. **Update main function signature:**
   ```javascript
   // Old
   async function showPanel(source, isInteraction, settings) { }
   
   // New
   async function showPanel(source, isInteraction, settings, isInitial = false) { }
   ```

2. **Update button handlers:**
   ```javascript
   // Old
   case "feature_config":
     await handleConfig(interaction, settings);
     await showPanel(source, isInteraction, settings);
     break;
   
   // New
   case "feature_config":
     await interaction.deferUpdate();
     await showConfigPanel(source, isInteraction, settings);
     break;
   ```

3. **Convert sub-panels:**
   ```javascript
   // Old
   async function handleConfig(interaction, settings) {
     await interaction.reply({ ...payload, ephemeral: true });
   }
   
   // New
   async function showConfigPanel(source, isInteraction, settings) {
     await source.editReply(payload);
     setupConfigCollector(source, isInteraction, settings);
   }
   ```

4. **Add back buttons and auto-return:**
   ```javascript
   // Add to all sub-panels
   const backButton = { 
     customId: "feature_back", 
     label: "Back", 
     emoji: "◀️", 
     style: ButtonStyle.Secondary 
   };
   
   // Add after save
   setTimeout(() => showMainPanel(source, isInteraction, settings, false), 2000);
   ```

---

## 📖 Permanent Rules

### These Rules Are Permanent and MUST Be Followed:

1. **Container Update Only**: Never create new messages in sub-panels
2. **Defer First**: Always `await interaction.deferUpdate()` before updating
3. **Back Buttons**: Every sub-panel MUST have a back button
4. **Auto-Return**: After state changes, show success for 2s then return to main
5. **Stop Collectors**: Always stop collectors before navigation
6. **Timeout Handling**: Collectors that timeout should return to main panel
7. **Error Handling**: Errors should not create new messages, log and return to main
8. **Naming**: Follow `{feature}_{action}` pattern for custom IDs
9. **Separation**: Main panel uses `isInitial` flag for collector setup
10. **Consistency**: All admin/config commands follow this exact pattern

---

**Last Updated:** November 3, 2025  
**Version:** 1.0.0  
**Status:** Production Standard

This rulebook is the permanent standard for all command development.
