const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");
const path = require("path");

// Load emojis from config
let EMOJIS = {};
try {
  const emojisPath = path.join(__dirname, "../../emojis.json");
  EMOJIS = JSON.parse(fs.readFileSync(emojisPath, "utf-8"));
} catch (error) {
  console.error("Failed to load emojis.json:", error);
  EMOJIS = {
    success: "<:success:1424072640829722745>",
    error: "<:error:1424072711671382076>",
    warning: "⚠️",
    info: "ℹ️"
  };
}

/**
 * Modern Embed Helper - Creates clean, professional Discord embeds with interactive components
 * Compatible with Discord.js 14.14+ using EmbedBuilder and latest component system
 */
class ModernEmbed {
  constructor() {
    this.embed = new EmbedBuilder();
    this.color = 0xFFFFFF;
    this.components = [];
  }

  /**
   * Set embed color
   * @param {number} color - Hex color code
   */
  setColor(color) {
    this.color = color;
    this.embed.setColor(color);
    return this;
  }

  /**
   * Set main title and description
   * @param {string} title - Main title with emoji
   * @param {string} description - Main description text
   */
  setHeader(title, description) {
    this.embed.setTitle(title);
    if (description) {
      this.embed.setDescription(description);
    }
    return this;
  }

  /**
   * Set description only
   * @param {string} description - Description text
   */
  setDescription(description) {
    this.embed.setDescription(description);
    return this;
  }

  /**
   * Set thumbnail image
   * @param {string} url - Image URL
   */
  setThumbnail(url) {
    this.embed.setThumbnail(url);
    return this;
  }

  /**
   * Set main image
   * @param {string} url - Image URL
   */
  setImage(url) {
    this.embed.setImage(url);
    return this;
  }

  /**
   * Add a field section
   * @param {string} name - Field name/header
   * @param {string} value - Field content
   * @param {boolean} inline - Whether to display inline
   */
  addField(name, value, inline = false) {
    this.embed.addFields({ name, value, inline });
    return this;
  }

  /**
   * Set footer text with optional icon
   * @param {string} text - Footer text
   * @param {string} iconURL - Optional icon URL
   */
  setFooter(text, iconURL) {
    this.embed.setFooter({ text, iconURL });
    return this;
  }

  /**
   * Set timestamp to current time or specific time
   * @param {Date} date - Optional date object
   */
  setTimestamp(date) {
    this.embed.setTimestamp(date || new Date());
    return this;
  }

  /**
   * Set author section
   * @param {string} name - Author name
   * @param {string} iconURL - Author icon URL
   * @param {string} url - Author URL
   */
  setAuthor(name, iconURL, url) {
    this.embed.setAuthor({ name, iconURL, url });
    return this;
  }

  /**
   * Add a button to the embed (max 5 buttons per row)
   * @param {Object} options - Button options
   * @param {string} options.customId - Custom ID for the button (required for non-link buttons)
   * @param {string} options.label - Button label text
   * @param {string} options.style - Button style: 'Primary', 'Secondary', 'Success', 'Danger', 'Link'
   * @param {string} options.emoji - Optional emoji for the button
   * @param {string} options.url - URL for link-style buttons
   * @param {boolean} options.disabled - Whether button is disabled
   */
  addButton({ customId, label, style = 'Secondary', emoji, url, disabled = false }) {
    const buttonStyle = ButtonStyle[style] || ButtonStyle.Secondary;
    
    // Validate required fields
    if (buttonStyle === ButtonStyle.Link && !url) {
      throw new Error('Link buttons require a URL');
    }
    if (buttonStyle !== ButtonStyle.Link && !customId) {
      throw new Error('Interactive buttons require a customId');
    }

    let lastRow = this.components[this.components.length - 1];
    const lastRowJson = lastRow ? lastRow.toJSON() : null;
    
    // Check if we need a new row (max 5 buttons, or if last row has select menu)
    if (!lastRow || lastRowJson?.components?.length >= 5 || lastRowJson?.components?.some(c => c.type === 3)) {
      lastRow = new ActionRowBuilder();
      this.components.push(lastRow);
    }

    const button = new ButtonBuilder()
      .setStyle(buttonStyle)
      .setDisabled(disabled);

    if (label) button.setLabel(label);
    if (emoji) button.setEmoji(emoji);
    
    if (buttonStyle === ButtonStyle.Link) {
      button.setURL(url);
    } else {
      button.setCustomId(customId);
    }

    lastRow.addComponents(button);
    return this;
  }

  /**
   * Add a select menu to the embed
   * @param {Object} options - Select menu options
   * @param {string} options.customId - Custom ID for the select menu
   * @param {string} options.placeholder - Placeholder text
   * @param {Array} options.options - Array of select options [{label, value, description, emoji, default}]
   * @param {number} options.minValues - Minimum values to select
   * @param {number} options.maxValues - Maximum values to select
   * @param {boolean} options.disabled - Whether select is disabled
   */
  addSelectMenu({ customId, placeholder, options, minValues = 1, maxValues = 1, disabled = false }) {
    if (!customId) {
      throw new Error('Select menus require a customId');
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder || 'Select an option')
      .setMinValues(minValues)
      .setMaxValues(maxValues)
      .setDisabled(disabled)
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);
    this.components.push(row);
    return this;
  }

  /**
   * Add an action row with quick action buttons
   * @param {string} type - Type of actions: 'navigation', 'confirmation', 'links'
   * @param {Object} options - Options for the action type
   */
  addQuickActions(type, options = {}) {
    const row = new ActionRowBuilder();

    switch (type) {
      case 'navigation':
        if (options.back) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(options.backId || 'back-btn')
              .setLabel(options.backLabel || 'Back')
              .setEmoji('◀️')
              .setStyle(ButtonStyle.Secondary)
          );
        }
        if (options.home) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(options.homeId || 'home-btn')
              .setLabel(options.homeLabel || 'Home')
              .setEmoji('🏠')
              .setStyle(ButtonStyle.Primary)
          );
        }
        if (options.next) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(options.nextId || 'next-btn')
              .setLabel(options.nextLabel || 'Next')
              .setEmoji('▶️')
              .setStyle(ButtonStyle.Secondary)
          );
        }
        break;

      case 'confirmation':
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(options.confirmId || 'confirm-btn')
            .setLabel(options.confirmLabel || 'Confirm')
            .setEmoji('✓')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(options.cancelId || 'cancel-btn')
            .setLabel(options.cancelLabel || 'Cancel')
            .setEmoji('✕')
            .setStyle(ButtonStyle.Danger)
        );
        break;

      case 'links':
        if (options.invite) {
          row.addComponents(
            new ButtonBuilder()
              .setLabel('Invite Bot')
              .setEmoji('🔗')
              .setStyle(ButtonStyle.Link)
              .setURL(options.invite)
          );
        }
        if (options.support) {
          row.addComponents(
            new ButtonBuilder()
              .setLabel('Support')
              .setEmoji('💬')
              .setStyle(ButtonStyle.Link)
              .setURL(options.support)
          );
        }
        if (options.docs) {
          row.addComponents(
            new ButtonBuilder()
              .setLabel('Docs')
              .setEmoji('📚')
              .setStyle(ButtonStyle.Link)
              .setURL(options.docs)
          );
        }
        if (options.website) {
          row.addComponents(
            new ButtonBuilder()
              .setLabel('Website')
              .setEmoji('🌐')
              .setStyle(ButtonStyle.Link)
              .setURL(options.website)
          );
        }
        break;
    }

    if (row.toJSON().components.length > 0) {
      this.components.push(row);
    }
    return this;
  }

  /**
   * Build and return the embed
   */
  build() {
    return this.embed;
  }

  /**
   * Return as message payload with components
   */
  toMessage() {
    const payload = { embeds: [this.embed] };
    if (this.components.length > 0) {
      payload.components = this.components;
    }
    return payload;
  }

  // Static quick methods for common embed types

  /**
   * Create a success embed
   * @param {string} title - Success title
   * @param {string} description - Success message
   * @param {string} footer - Optional footer text
   * @param {Object} components - Optional components configuration
   */
  static success(title, description, footer, components = null) {
    const embed = new ModernEmbed()
      .setColor(0xFFFFFF)
      .setHeader(`${EMOJIS.success || "<:success:1424072640829722745>"} ${title}`, description)
      .setTimestamp();
    
    if (footer) embed.setFooter(footer);
    if (components) embed.addQuickActions(components.type, components.options);
    return embed.toMessage();
  }

  /**
   * Create an error embed
   * @param {string} title - Error title
   * @param {string} description - Error message
   * @param {string} footer - Optional footer text
   * @param {Object} components - Optional components configuration
   */
  static error(title, description, footer, components = null) {
    const embed = new ModernEmbed()
      .setColor(0xFFFFFF)
      .setHeader(`${EMOJIS.error || "<:error:1424072711671382076>"} ${title}`, description)
      .setTimestamp();
    
    if (footer) embed.setFooter(footer);
    if (components) embed.addQuickActions(components.type, components.options);
    return embed.toMessage();
  }

  /**
   * Create a simple error message (text-only style)
   * @param {string} message - Error message
   */
  static simpleError(message) {
    const embed = new ModernEmbed()
      .setColor(0xFFFFFF)
      .setDescription(`${EMOJIS.error || "<:error:1424072711671382076>"} | ${message}`);
    
    return embed.toMessage();
  }

  /**
   * Create a simple success message (text-only style)
   * @param {string} message - Success message
   */
  static simpleSuccess(message) {
    const embed = new ModernEmbed()
      .setColor(0xFFFFFF)
      .setDescription(`${EMOJIS.success || "<:success:1424072640829722745>"} | ${message}`);
    
    return embed.toMessage();
  }

  /**
   * Get emoji from config
   * @param {string} name - Emoji name from config
   * @returns {string} Emoji or default
   */
  static getEmoji(name) {
    return EMOJIS[name] || "";
  }

  /**
   * Reload emojis from config
   */
  static reloadEmojis() {
    try {
      const emojisPath = path.join(__dirname, "../../emojis.json");
      delete require.cache[require.resolve(emojisPath)];
      EMOJIS = JSON.parse(fs.readFileSync(emojisPath, "utf-8"));
      return true;
    } catch (error) {
      console.error("Failed to reload emojis.json:", error);
      return false;
    }
  }

  /**
   * Create a warning embed
   * @param {string} title - Warning title
   * @param {string} description - Warning message
   * @param {string} footer - Optional footer text
   * @param {Object} components - Optional components configuration
   */
  static warning(title, description, footer, components = null) {
    const embed = new ModernEmbed()
      .setColor(0xFFFFFF)
      .setHeader(`${EMOJIS.warning || "⚠️"} ${title}`, description)
      .setTimestamp();
    
    if (footer) embed.setFooter(footer);
    if (components) embed.addQuickActions(components.type, components.options);
    return embed.toMessage();
  }

  /**
   * Create an info embed
   * @param {string} title - Info title
   * @param {string} description - Info message
   * @param {string} footer - Optional footer text
   * @param {Object} components - Optional components configuration
   */
  static info(title, description, footer, components = null) {
    const embed = new ModernEmbed()
      .setColor(0xFFFFFF)
      .setHeader(`${EMOJIS.info || "ℹ️"} ${title}`, description)
      .setTimestamp();
    
    if (footer) embed.setFooter(footer);
    if (components) embed.addQuickActions(components.type, components.options);
    return embed.toMessage();
  }
}

module.exports = ModernEmbed;
