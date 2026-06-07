const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

class ContainerBuilder {
  constructor() {
    this._containers = [];
  }

  addContainer({ accentColor = null, components = [], spoiler = false, id = null } = {}) {
    this._containers.push({ accentColor, components });
    return this;
  }

  build() {
    const embeds = [];
    const components = [];

    for (const container of this._containers) {
      const embed = new EmbedBuilder().setColor(container.accentColor || 0xFFFFFF);
      let descParts = [];

      for (const comp of container.components) {
        if (!comp) continue;

        if (comp.type === 10) {
          descParts.push(comp.content);
        } else if (comp.type === 14) {
          descParts.push("\u200b");
        } else if (comp.type === 12) {
          const url = comp.items?.[0]?.media?.url;
          if (url) embed.setThumbnail(url);
        } else if (comp.type === 1) {
          const row = new ActionRowBuilder();
          for (const b of comp.components) {
            try { row.addComponents(ButtonBuilder.from(b)); } catch (_) {}
          }
          components.push(row);
        } else if (comp instanceof ActionRowBuilder || (comp?.data?.type === 1)) {
          components.push(comp);
        }
      }

      if (descParts.length) embed.setDescription(descParts.join("\n"));
      embeds.push(embed);
    }

    return { embeds, components };
  }

  static createTextDisplay(content) {
    return { type: 10, content: String(content) };
  }

  static createSeparator() {
    return { type: 14 };
  }

  static createMediaGallery(items) {
    return { type: 12, items };
  }

  static createThumbnail(url) {
    return { type: 12, items: [{ media: { url } }] };
  }

  static createActionRow(components) {
    return { type: 1, components };
  }

  static createButton({ customId, label, style = "Secondary", emoji, url, disabled = false }) {
    const buttonStyle = ButtonStyle[style] || ButtonStyle.Secondary;
    const button = new ButtonBuilder().setStyle(buttonStyle).setDisabled(disabled);
    if (label) button.setLabel(label);
    if (emoji) button.setEmoji(emoji);
    if (buttonStyle === ButtonStyle.Link) button.setURL(url);
    else button.setCustomId(customId);
    return button.toJSON();
  }

  static quickMessage(title, description = null, fields = [], accentColor = 0xFFFFFF, buttons = []) {
    const embed = new EmbedBuilder().setColor(accentColor);

    let desc = "";
    if (title) desc += `## ${title}`;
    if (description) desc += (desc ? "\n\n" : "") + description;
    if (desc) embed.setDescription(desc);

    if (fields.length > 0) {
      embed.addFields(fields.map((f) => ({ name: f.name, value: String(f.value), inline: !!f.inline })));
    }

    const components = [];
    if (buttons.length > 0) {
      const row = new ActionRowBuilder();
      for (const btn of buttons) {
        try { row.addComponents(ButtonBuilder.from(ContainerBuilder.createButton(btn))); } catch (_) {}
      }
      components.push(row);
    }

    return { embeds: [embed], components };
  }

  static serverInfo({ title, description, thumbnail, fields, accentColor = 0xFFFFFF, buttons = [] }) {
    const embed = new EmbedBuilder().setColor(accentColor);
    if (thumbnail) embed.setThumbnail(thumbnail);

    let desc = "";
    if (title) desc += `## ${title}`;
    if (description) desc += (desc ? "\n\n" : "") + description;
    if (desc) embed.setDescription(desc);

    if (fields && fields.length > 0) {
      embed.addFields(fields.map((f) => ({ name: f.name, value: String(f.value), inline: !!f.inline })));
    }

    const components = [];
    if (buttons.length > 0) {
      const row = new ActionRowBuilder();
      for (const btn of buttons) {
        try { row.addComponents(ButtonBuilder.from(ContainerBuilder.createButton(btn))); } catch (_) {}
      }
      components.push(row);
    }

    return { embeds: [embed], components };
  }

  static success(title, message, accentColor = 0x43B581, buttons = []) {
    return ContainerBuilder.quickMessage(`✅ ${title}`, message, [], accentColor, buttons);
  }

  static error(title, message, accentColor = 0xF04747, buttons = []) {
    return ContainerBuilder.quickMessage(`❌ ${title}`, message, [], accentColor, buttons);
  }

  static warning(title, message, accentColor = 0xFAA61A, buttons = []) {
    return ContainerBuilder.quickMessage(`⚠️ ${title}`, message, [], accentColor, buttons);
  }

  static info(title, message, accentColor = 0x5865F2, buttons = []) {
    return ContainerBuilder.quickMessage(`ℹ️ ${title}`, message, [], accentColor, buttons);
  }

  static botInfoCard({ title, subtitle, thumbnail, statisticsFields = [], systemFields = [], buttons = [] }) {
    const embed = new EmbedBuilder().setColor(0xFFFFFF);
    if (thumbnail) embed.setThumbnail(thumbnail);

    let desc = "";
    if (title) desc += `# ${title}`;
    if (subtitle) desc += (desc ? "\n" : "") + subtitle;
    if (desc) embed.setDescription(desc);

    const allFields = [];
    if (statisticsFields.length > 0) {
      allFields.push({ name: "📊 Statistics", value: statisticsFields.map((f) => `**${f.label}:** ${f.value}`).join("\n"), inline: false });
    }
    if (systemFields.length > 0) {
      allFields.push({ name: "⚙️ System", value: systemFields.map((f) => `**${f.label}:** ${f.value}`).join("\n"), inline: false });
    }
    if (allFields.length) embed.addFields(allFields);

    const components = [];
    if (buttons.length > 0) {
      const row = new ActionRowBuilder();
      for (const btn of buttons) {
        const b = new ButtonBuilder().setLabel(btn.label).setURL(btn.url).setStyle(ButtonStyle.Link);
        if (btn.emoji) b.setEmoji(btn.emoji);
        row.addComponents(b);
      }
      components.push(row);
    }

    return { embeds: [embed], components };
  }
}

module.exports = ContainerBuilder;
