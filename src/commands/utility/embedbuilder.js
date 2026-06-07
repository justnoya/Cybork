const {
  ChannelType,
  ComponentType,
  ButtonStyle,
  TextInputStyle,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const InteractionUtils = require("@helpers/InteractionUtils");
const { EMBED_COLORS } = require("@root/config");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "embedbuilder",
  description: "Advanced embed builder with all customization options",
  category: "UTILITY",
  userPermissions: ["ManageMessages"],
  command: {
    enabled: true,
    usage: "<#channel>",
    minArgsCount: 1,
    aliases: ["eb", "embedcreator"],
  },
  slashCommand: {
    enabled: true,
    ephemeral: true,
    options: [
      {
        name: "channel",
        description: "Channel to send the embed",
        type: 7, // Channel type
        channelTypes: [ChannelType.GuildText],
        required: true,
      },
    ],
  },

  async messageRun(message, args) {
    const channel =
      message.mentions.channels.first() ||
      message.guild.channels.cache.get(args[0]);
    if (!channel || channel.type !== ChannelType.GuildText) {
      return message.reply("❌ Please provide a valid text channel!");
    }
    if (!channel.permissionsFor(message.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
      return message.reply(
        "❌ I don't have permission to send messages in that channel!"
      );
    }
    message.reply(`✅ Embed builder started in ${channel}`);
    await startEmbedBuilder(channel, message.member, message);
  },

  async interactionRun(interaction) {
    const channel = interaction.options.getChannel("channel");
    if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
      return interaction.followUp(
        "❌ I don't have permission to send messages in that channel!"
      );
    }
    await interaction.followUp(`✅ Embed builder started in ${channel}`);
    await startEmbedBuilder(channel, interaction.member, interaction);
  },
};

/**
 * Start embed builder session
 */
async function startEmbedBuilder(channel, member, source) {
  const embedData = {
    color: EMBED_COLORS.BOT_EMBED,
    title: null,
    description: null,
    author: null,
    footer: null,
    thumbnail: null,
    image: null,
    fields: [],
    timestamp: false,
    url: null,
  };

  const menuMsg = await channel.send({
    embeds: [createPreviewEmbed(embedData)],
    components: createBuilderComponents(),
  });

  const collector = menuMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === member.id,
    time: 600000, // 10 minutes
  });

  collector.on("collect", async (interaction) => {
    try {
      switch (interaction.customId) {
        case "eb_basic":
          await handleBasicSetup(interaction, embedData);
          break;
        case "eb_author":
          await handleAuthorSetup(interaction, embedData);
          break;
        case "eb_footer":
          await handleFooterSetup(interaction, embedData);
          break;
        case "eb_media":
          await handleMediaSetup(interaction, embedData);
          break;
        case "eb_field_add":
          await handleAddField(interaction, embedData);
          break;
        case "eb_field_remove":
          handleRemoveField(interaction, embedData);
          break;
        case "eb_timestamp":
          embedData.timestamp = !embedData.timestamp;
          await interaction.deferUpdate();
          break;
        case "eb_send":
          await handleSend(interaction, embedData, collector);
          return;
        case "eb_cancel":
          await handleCancel(interaction, menuMsg, collector);
          return;
      }

      await menuMsg.edit({
        embeds: [createPreviewEmbed(embedData)],
        components: createBuilderComponents(),
      });
    } catch (error) {
      console.error("Embed builder error:", error);
      await interaction.reply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  });

  collector.on("end", () => {
    menuMsg
      .edit({
        components: InteractionUtils.disableComponents(menuMsg.components),
      })
      .catch(() => {});
  });
}

/**
 * Create builder components
 */
function createBuilderComponents() {
  const row1 = InteractionUtils.createButtonRow([
    {
      customId: "eb_basic",
      label: "Basic Info",
      emoji: "📝",
      style: ButtonStyle.Primary,
    },
    {
      customId: "eb_author",
      label: "Author",
      emoji: "👤",
      style: ButtonStyle.Primary,
    },
    {
      customId: "eb_footer",
      label: "Footer",
      emoji: "📄",
      style: ButtonStyle.Primary,
    },
  ]);

  const row2 = InteractionUtils.createButtonRow([
    {
      customId: "eb_media",
      label: "Images",
      emoji: "🖼️",
      style: ButtonStyle.Primary,
    },
    {
      customId: "eb_field_add",
      label: "Add Field",
      emoji: "➕",
      style: ButtonStyle.Success,
    },
    {
      customId: "eb_field_remove",
      label: "Remove Field",
      emoji: "➖",
      style: ButtonStyle.Danger,
    },
  ]);

  const row3 = InteractionUtils.createButtonRow([
    {
      customId: "eb_timestamp",
      label: "Toggle Timestamp",
      emoji: "⏰",
      style: ButtonStyle.Secondary,
    },
    {
      customId: "eb_send",
      label: "Send Embed",
      emoji: "✅",
      style: ButtonStyle.Success,
    },
    {
      customId: "eb_cancel",
      label: "Cancel",
      emoji: "❌",
      style: ButtonStyle.Danger,
    },
  ]);

  return [row1, row2, row3];
}

/**
 * Create preview embed
 */
function createPreviewEmbed(data) {
  const embed = new EmbedBuilder().setColor(data.color || EMBED_COLORS.BOT_EMBED);

  if (data.title) embed.setTitle(data.title);
  if (data.description) embed.setDescription(data.description);
  if (data.author) embed.setAuthor(data.author);
  if (data.footer) embed.setFooter(data.footer);
  if (data.thumbnail) embed.setThumbnail(data.thumbnail);
  if (data.image) embed.setImage(data.image);
  if (data.url) embed.setURL(data.url);
  if (data.timestamp) embed.setTimestamp();
  if (data.fields && data.fields.length > 0) embed.addFields(data.fields);

  if (!data.title && !data.description && !data.author) {
    embed.setDescription("*Empty embed - use the buttons below to customize*");
  }

  return embed;
}

/**
 * Handle basic setup
 */
async function handleBasicSetup(interaction, embedData) {
  const modal = InteractionUtils.createModal("eb_basic_modal", "Basic Embed Info", [
    {
      customId: "title",
      label: "Embed Title",
      style: TextInputStyle.Short,
      placeholder: "Enter title (optional)",
      required: false,
      value: embedData.title || "",
      maxLength: 256,
    },
    {
      customId: "description",
      label: "Embed Description",
      style: TextInputStyle.Paragraph,
      placeholder: "Enter description (optional)",
      required: false,
      value: embedData.description || "",
      maxLength: 4000,
    },
    {
      customId: "color",
      label: "Embed Color (Hex)",
      style: TextInputStyle.Short,
      placeholder: "#5865F2",
      required: false,
      value: embedData.color || EMBED_COLORS.BOT_EMBED,
    },
    {
      customId: "url",
      label: "Title URL (optional)",
      style: TextInputStyle.Short,
      placeholder: "https://example.com",
      required: false,
      value: embedData.url || "",
    },
  ]);

  await interaction.showModal(modal);

  const modalSubmit = await InteractionUtils.awaitModalSubmit(interaction, "eb_basic_modal");

  if (!modalSubmit) return;

  embedData.title = modalSubmit.fields.getTextInputValue("title") || null;
  embedData.description = modalSubmit.fields.getTextInputValue("description") || null;
  embedData.color = modalSubmit.fields.getTextInputValue("color") || EMBED_COLORS.BOT_EMBED;
  embedData.url = modalSubmit.fields.getTextInputValue("url") || null;

  await modalSubmit.deferUpdate();
}

/**
 * Handle author setup
 */
async function handleAuthorSetup(interaction, embedData) {
  const modal = InteractionUtils.createModal("eb_author_modal", "Embed Author", [
    {
      customId: "name",
      label: "Author Name",
      style: TextInputStyle.Short,
      placeholder: "Enter author name",
      required: true,
      value: embedData.author?.name || "",
      maxLength: 256,
    },
    {
      customId: "icon",
      label: "Author Icon URL (optional)",
      style: TextInputStyle.Short,
      placeholder: "https://example.com/icon.png",
      required: false,
      value: embedData.author?.iconURL || "",
    },
    {
      customId: "url",
      label: "Author URL (optional)",
      style: TextInputStyle.Short,
      placeholder: "https://example.com",
      required: false,
      value: embedData.author?.url || "",
    },
  ]);

  await interaction.showModal(modal);

  const modalSubmit = await InteractionUtils.awaitModalSubmit(interaction, "eb_author_modal");

  if (!modalSubmit) return;

  const name = modalSubmit.fields.getTextInputValue("name");
  const iconURL = modalSubmit.fields.getTextInputValue("icon") || undefined;
  const url = modalSubmit.fields.getTextInputValue("url") || undefined;

  embedData.author = { name, iconURL, url };

  await modalSubmit.deferUpdate();
}

/**
 * Handle footer setup
 */
async function handleFooterSetup(interaction, embedData) {
  const modal = InteractionUtils.createModal("eb_footer_modal", "Embed Footer", [
    {
      customId: "text",
      label: "Footer Text",
      style: TextInputStyle.Short,
      placeholder: "Enter footer text",
      required: true,
      value: embedData.footer?.text || "",
      maxLength: 2048,
    },
    {
      customId: "icon",
      label: "Footer Icon URL (optional)",
      style: TextInputStyle.Short,
      placeholder: "https://example.com/icon.png",
      required: false,
      value: embedData.footer?.iconURL || "",
    },
  ]);

  await interaction.showModal(modal);

  const modalSubmit = await InteractionUtils.awaitModalSubmit(interaction, "eb_footer_modal");

  if (!modalSubmit) return;

  const text = modalSubmit.fields.getTextInputValue("text");
  const iconURL = modalSubmit.fields.getTextInputValue("icon") || undefined;

  embedData.footer = { text, iconURL };

  await modalSubmit.deferUpdate();
}

/**
 * Handle media setup
 */
async function handleMediaSetup(interaction, embedData) {
  const modal = InteractionUtils.createModal("eb_media_modal", "Embed Images", [
    {
      customId: "thumbnail",
      label: "Thumbnail URL (small image on right)",
      style: TextInputStyle.Short,
      placeholder: "https://example.com/thumb.png",
      required: false,
      value: embedData.thumbnail || "",
    },
    {
      customId: "image",
      label: "Image URL (large image below)",
      style: TextInputStyle.Short,
      placeholder: "https://example.com/image.png",
      required: false,
      value: embedData.image || "",
    },
  ]);

  await interaction.showModal(modal);

  const modalSubmit = await InteractionUtils.awaitModalSubmit(interaction, "eb_media_modal");

  if (!modalSubmit) return;

  embedData.thumbnail = modalSubmit.fields.getTextInputValue("thumbnail") || null;
  embedData.image = modalSubmit.fields.getTextInputValue("image") || null;

  await modalSubmit.deferUpdate();
}

/**
 * Handle add field
 */
async function handleAddField(interaction, embedData) {
  if (embedData.fields.length >= 25) {
    return interaction.reply({
      content: "❌ Maximum 25 fields allowed!",
      ephemeral: true,
    });
  }

  const modal = InteractionUtils.createModal("eb_field_modal", "Add Embed Field", [
    {
      customId: "name",
      label: "Field Name",
      style: TextInputStyle.Short,
      placeholder: "Enter field name",
      required: true,
      maxLength: 256,
    },
    {
      customId: "value",
      label: "Field Value",
      style: TextInputStyle.Paragraph,
      placeholder: "Enter field value",
      required: true,
      maxLength: 1024,
    },
    {
      customId: "inline",
      label: "Inline? (yes/no)",
      style: TextInputStyle.Short,
      placeholder: "yes or no",
      required: false,
      value: "no",
    },
  ]);

  await interaction.showModal(modal);

  const modalSubmit = await InteractionUtils.awaitModalSubmit(interaction, "eb_field_modal");

  if (!modalSubmit) return;

  const name = modalSubmit.fields.getTextInputValue("name");
  const value = modalSubmit.fields.getTextInputValue("value");
  const inline = modalSubmit.fields.getTextInputValue("inline").toLowerCase() === "yes";

  embedData.fields.push({ name, value, inline });

  await modalSubmit.deferUpdate();
}

/**
 * Handle remove field
 */
function handleRemoveField(interaction, embedData) {
  if (embedData.fields.length === 0) {
    return interaction.reply({
      content: "❌ No fields to remove!",
      ephemeral: true,
    });
  }

  embedData.fields.pop();
  interaction.deferUpdate();
}

/**
 * Handle send
 */
async function handleSend(interaction, embedData, collector) {
  const embed = createPreviewEmbed(embedData);

  if (!embedData.title && !embedData.description && embedData.fields.length === 0) {
    return interaction.reply({
      content: "❌ Cannot send an empty embed!",
      ephemeral: true,
    });
  }

  await interaction.message.channel.send({ embeds: [embed] });
  
  await interaction.update({
    content: "✅ Embed sent successfully!",
    embeds: [],
    components: [],
  });

  collector.stop();
}

/**
 * Handle cancel
 */
async function handleCancel(interaction, message, collector) {
  await interaction.update({
    content: "❌ Embed builder cancelled.",
    embeds: [],
    components: [],
  });

  collector.stop();
}
