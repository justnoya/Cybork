const {
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const { EMBED_COLORS } = require("@root/config");

class InteractionUtils {
  static createModal(customId, title, inputs) {
    const modal = new ModalBuilder()
      .setCustomId(customId)
      .setTitle(title);

    const rows = inputs.map(input => {
      const textInput = new TextInputBuilder()
        .setCustomId(input.customId)
        .setLabel(input.label)
        .setStyle(input.style || TextInputStyle.Short)
        .setRequired(input.required ?? false);

      if (input.placeholder) textInput.setPlaceholder(input.placeholder);
      if (input.value) textInput.setValue(input.value);
      if (input.minLength) textInput.setMinLength(input.minLength);
      if (input.maxLength) textInput.setMaxLength(input.maxLength);

      return new ActionRowBuilder().addComponents(textInput);
    });

    modal.addComponents(...rows);
    return modal;
  }

  static createButtonRow(buttons) {
    const row = new ActionRowBuilder();
    
    buttons.forEach(btn => {
      const button = new ButtonBuilder()
        .setCustomId(btn.customId)
        .setStyle(btn.style || ButtonStyle.Primary)
        .setDisabled(btn.disabled || false);

      if (btn.label) button.setLabel(btn.label);
      if (btn.emoji) button.setEmoji(btn.emoji);
      row.addComponents(button);
    });

    return row;
  }

  static createSelectMenu(customId, placeholder, options, config = {}) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .setMinValues(config.minValues || 1)
      .setMaxValues(config.maxValues || 1)
      .setDisabled(config.disabled || false);

    const formattedOptions = options.map(opt => ({
      label: opt.label,
      value: opt.value,
      description: opt.description || undefined,
      emoji: opt.emoji || undefined,
      default: opt.default || false,
    }));

    menu.addOptions(formattedOptions);
    return new ActionRowBuilder().addComponents(menu);
  }

  static createThemedEmbed(options = {}) {
    const embed = new EmbedBuilder()
      .setColor(options.color || EMBED_COLORS.BOT_EMBED);

    if (options.title) embed.setTitle(options.title);
    if (options.description) embed.setDescription(options.description);
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.image) embed.setImage(options.image);
    if (options.footer) {
      embed.setFooter(
        typeof options.footer === 'string' 
          ? { text: options.footer } 
          : options.footer
      );
    }
    if (options.author) embed.setAuthor(options.author);
    if (options.fields) embed.addFields(options.fields);
    if (options.timestamp) embed.setTimestamp(options.timestamp === true ? new Date() : options.timestamp);
    if (options.url) embed.setURL(options.url);

    return embed;
  }

  static createLoadingEmbed(message = "Processing...") {
    return this.createThemedEmbed({
      description: `⏳ ${message}`,
      color: EMBED_COLORS.PRIMARY,
    });
  }

  static createSuccessEmbed(message) {
    return this.createThemedEmbed({
      description: `✅ ${message}`,
      color: EMBED_COLORS.SUCCESS,
    });
  }

  static createErrorEmbed(message) {
    return this.createThemedEmbed({
      description: `❌ ${message}`,
      color: EMBED_COLORS.ERROR,
    });
  }

  static createWarningEmbed(message) {
    return this.createThemedEmbed({
      description: `⚠️ ${message}`,
      color: EMBED_COLORS.WARNING,
    });
  }

  static async awaitModalSubmit(interaction, customId, timeout = 300000) {
    try {
      const modal = await interaction.awaitModalSubmit({
        filter: (i) => i.customId === customId && i.user.id === interaction.user.id,
        time: timeout,
      });
      return modal;
    } catch (error) {
      return null;
    }
  }

  static async awaitComponent(message, userId, filter = {}, timeout = 300000) {
    try {
      const component = await message.awaitMessageComponent({
        filter: (i) => {
          if (i.user.id !== userId) return false;
          if (filter.customId && i.customId !== filter.customId) return false;
          if (filter.componentType && i.componentType !== filter.componentType) return false;
          return true;
        },
        time: timeout,
      });
      return component;
    } catch (error) {
      return null;
    }
  }

  static createNavigationButtons(state = {}) {
    const { currentPage = 0, totalPages = 1, disabled = false } = state;
    
    return this.createButtonRow([
      {
        customId: "nav_first",
        emoji: "⏮️",
        style: ButtonStyle.Secondary,
        disabled: disabled || currentPage === 0,
      },
      {
        customId: "nav_prev",
        emoji: "◀️",
        style: ButtonStyle.Primary,
        disabled: disabled || currentPage === 0,
      },
      {
        customId: "nav_page",
        label: `${currentPage + 1} / ${totalPages}`,
        style: ButtonStyle.Secondary,
        disabled: true,
      },
      {
        customId: "nav_next",
        emoji: "▶️",
        style: ButtonStyle.Primary,
        disabled: disabled || currentPage >= totalPages - 1,
      },
      {
        customId: "nav_last",
        emoji: "⏭️",
        style: ButtonStyle.Secondary,
        disabled: disabled || currentPage >= totalPages - 1,
      },
    ]);
  }

  static disableComponents(components) {
    return components.map(row => {
      const newRow = new ActionRowBuilder();
      row.components.forEach(component => {
        if (component.data.style === ButtonStyle.Link) {
          newRow.addComponents(ButtonBuilder.from(component));
        } else {
          const comp = component.data.type === 2 
            ? ButtonBuilder.from(component).setDisabled(true)
            : component.type === 3
              ? StringSelectMenuBuilder.from(component).setDisabled(true)
              : component;
          newRow.addComponents(comp);
        }
      });
      return newRow;
    });
  }

  static chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  static truncateText(text, maxLength = 100, suffix = "...") {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  }
}

module.exports = InteractionUtils;
