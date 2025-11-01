const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
  ComponentType,
} = require("discord.js");
const { EMBED_COLORS } = require("@root/config.js");
const { getBuffer } = require("@helpers/HttpUtils");
const PinterestScraper = require("@helpers/PinterestScraper");
const InteractionUtils = require("@helpers/InteractionUtils");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "pfp",
  description: "Search Pinterest for aesthetic profile pictures with custom queries or presets",
  category: "PFP",
  botPermissions: ["SendMessages", "EmbedLinks", "AttachFiles"],
  cooldown: 5,
  command: {
    enabled: false,
    usage: "[query]",
  },
  slashCommand: {
    enabled: true,
    options: [],
  },

  async messageRun(message, args) {
    try {
      const query = String(args.join(" ") || "");
      if (query.trim()) {
        await searchAndDisplay(message, query.trim(), false);
      } else {
        await showMainMenu(message, false);
      }
    } catch (error) {
      console.error("PFP messageRun error:", error);
      await message.safeReply({
        embeds: [InteractionUtils.createErrorEmbed(`An error occurred: ${error.message}`)],
      }).catch(() => {});
    }
  },

  async interactionRun(interaction) {
    try {
      await interaction.deferReply();
      await showMainMenu(interaction, true);
    } catch (error) {
      console.error("PFP interactionRun error:", error);
      const errorEmbed = InteractionUtils.createErrorEmbed(`An error occurred: ${error.message}`);
      if (!interaction.replied) {
        await interaction.followUp({ embeds: [errorEmbed] }).catch(() => {});
      } else {
        await interaction.editReply({ embeds: [errorEmbed] }).catch(() => {});
      }
    }
  },
};

/**
 * Show main menu with preset options
 */
async function showMainMenu(source, isInteraction) {
  const embed = InteractionUtils.createThemedEmbed({
    title: "🖼️ Profile Picture Search",
    description: "Choose a preset category or search with a custom query:",
    fields: [
      {
        name: "Preset Categories",
        value: "• Aesthetic Boy Real PFP\n• Aesthetic Girl Real PFP",
        inline: false,
      },
      {
        name: "Custom Search",
        value: "Click the button below to enter your own search query",
        inline: false,
      },
    ],
    footer: "Results show 5 unique images",
    timestamp: true,
  });

  const row1 = InteractionUtils.createButtonRow([
    {
      customId: "pfp_boy",
      label: "Aesthetic Boy",
      emoji: "👦",
      style: ButtonStyle.Primary,
    },
    {
      customId: "pfp_girl",
      label: "Aesthetic Girl",
      emoji: "👧",
      style: ButtonStyle.Primary,
    },
  ]);

  const row2 = InteractionUtils.createButtonRow([
    {
      customId: "pfp_custom",
      label: "Custom Search",
      emoji: "🔍",
      style: ButtonStyle.Success,
    },
  ]);

  const msg = isInteraction
    ? await source.editReply({ embeds: [embed], components: [row1, row2] })
    : await source.channel.send({ embeds: [embed], components: [row1, row2] });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === (isInteraction ? source.user.id : source.author.id),
    time: 120000,
  });

  collector.on("collect", async (interaction) => {
    try {
      if (interaction.customId === "pfp_boy") {
        await interaction.deferUpdate();
        await searchAndDisplay(interaction, "aesthetic boy real pfp", true);
        collector.stop();
      } else if (interaction.customId === "pfp_girl") {
        await interaction.deferUpdate();
        await searchAndDisplay(interaction, "aesthetic girl real pfp", true);
        collector.stop();
      } else if (interaction.customId === "pfp_custom") {
        await showCustomQueryModal(interaction);
        collector.stop();
      }
    } catch (error) {
      console.error("PFP menu collector error:", error);
      if (!interaction.replied && !interaction.deferred) {
        const errorMessage = error?.message || String(error) || "Unknown error";
        await interaction.reply({
          content: `❌ An error occurred: ${errorMessage}`,
          ephemeral: true,
        }).catch(() => {});
      }
    }
  });

  collector.on("end", () => {
    msg.edit({ components: InteractionUtils.disableComponents([row1, row2]) }).catch(() => {});
  });
}

/**
 * Show custom query modal
 */
async function showCustomQueryModal(interaction) {
  try {
    const modal = InteractionUtils.createModal("pfp_custom_modal", "Custom PFP Search", [
      {
        customId: "query",
        label: "Enter your search query",
        style: TextInputStyle.Short,
        placeholder: "e.g., anime aesthetic, dark gothic, nature...",
        required: true,
        minLength: 2,
        maxLength: 100,
      },
    ]);

    await interaction.showModal(modal);

    const modalSubmit = await InteractionUtils.awaitModalSubmit(interaction, "pfp_custom_modal", 120000);
    
    if (modalSubmit) {
      const query = String(modalSubmit.fields.getTextInputValue("query") || "").trim();
      await modalSubmit.deferUpdate();
      await searchAndDisplay(modalSubmit, query, true);
    }
  } catch (error) {
    console.error("PFP custom modal error:", error);
    if (!interaction.replied && !interaction.deferred) {
      const errorMessage = error?.message || String(error) || "Unknown error";
      await interaction.reply({
        content: `❌ Failed to show search modal: ${errorMessage}`,
        ephemeral: true,
      }).catch(() => {});
    }
  }
}

/**
 * Search and display results
 */
async function searchAndDisplay(source, query, isInteraction) {
  try {
    // Ensure query is a string and validate
    const queryStr = String(query || "");
    const cleanQuery = queryStr.trim();
    
    if (cleanQuery.length < 2) {
      const errorEmbed = InteractionUtils.createErrorEmbed("Search query is too short. Please enter at least 2 characters.");
      if (isInteraction) {
        return source.editReply({ embeds: [errorEmbed], components: [] }).catch(() => {});
      }
      return source.channel.send({ embeds: [errorEmbed] }).catch(() => {});
    }
    
    // If query is only numbers, add context to make it searchable
    const isOnlyNumbers = /^\d+$/.test(cleanQuery);
    const searchQuery = isOnlyNumbers ? `aesthetic ${cleanQuery} pfp` : cleanQuery;
    
    const loadingEmbed = InteractionUtils.createLoadingEmbed("Searching Pinterest for unique images...");
    
    const msg = isInteraction
      ? await source.editReply({ embeds: [loadingEmbed], components: [] }).catch(() => null)
      : await source.channel.send({ embeds: [loadingEmbed] }).catch(() => null);

    if (!msg) {
      console.error("Failed to send loading message");
      return;
    }

    try {
      const results = await PinterestScraper.searchCustomQuery(searchQuery, 5);

      if (!results || results.length === 0) {
        return msg.edit({ 
          embeds: [InteractionUtils.createErrorEmbed("No results found. Try a different query.")],
          components: []
        }).catch(() => {});
      }

      const state = {
        results,
        query: searchQuery,
        currentIndex: 0,
        userId: isInteraction ? source.user.id : source.author.id,
      };

      await displayResult(msg, state);
      setupCollector(msg, state);
    } catch (error) {
      console.error("PFP search error:", error);
      const errorMessage = error?.message || String(error) || "Unknown error occurred";
      return msg.edit({
        embeds: [InteractionUtils.createErrorEmbed(`Search failed: ${errorMessage}`)],
        components: []
      }).catch(() => {});
    }
  } catch (error) {
    console.error("PFP searchAndDisplay error:", error);
  }
}

/**
 * Display single result
 */
async function displayResult(message, state) {
  const result = state.results[state.currentIndex];
  
  // Ensure result has required properties
  if (!result || !result.link) {
    console.error("Invalid result object:", result);
    return;
  }
  
  const embed = InteractionUtils.createThemedEmbed({
    title: `🔍 ${state.query}`,
    description: result.isFallback
      ? "⚠️ Pinterest scraping unavailable. Click the link below to search manually."
      : result.description || "Click download to save this image",
    thumbnail: (result.image && !result.isFallback) ? result.image : undefined,
    footer: `Result ${state.currentIndex + 1} of ${state.results.length} • No duplicates`,
    timestamp: true,
    url: result.link,
  });

  const navRow = InteractionUtils.createNavigationButtons({
    currentPage: state.currentIndex,
    totalPages: state.results.length,
  });

  const actionRow = InteractionUtils.createButtonRow([
    {
      customId: "pfp_download",
      label: "Download",
      emoji: "💾",
      style: ButtonStyle.Success,
      disabled: result.isFallback || !result.image,
    },
    {
      customId: "pfp_new_search",
      label: "New Search",
      emoji: "🔄",
      style: ButtonStyle.Secondary,
    },
  ]);

  const linkRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("View on Pinterest")
      .setURL(result.link)
      .setStyle(ButtonStyle.Link)
      .setEmoji("🔗")
  );

  await message.edit({
    embeds: [embed],
    components: [navRow, actionRow, linkRow],
  });
}

/**
 * Setup collector for interactions
 */
function setupCollector(message, state) {
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === state.userId,
    time: 300000,
  });

  collector.on("collect", async (interaction) => {
    try {
      if (interaction.customId === "nav_first") {
        state.currentIndex = 0;
        await interaction.deferUpdate();
        await displayResult(message, state);
      } else if (interaction.customId === "nav_prev") {
        state.currentIndex = Math.max(0, state.currentIndex - 1);
        await interaction.deferUpdate();
        await displayResult(message, state);
      } else if (interaction.customId === "nav_next") {
        state.currentIndex = Math.min(state.results.length - 1, state.currentIndex + 1);
        await interaction.deferUpdate();
        await displayResult(message, state);
      } else if (interaction.customId === "nav_last") {
        state.currentIndex = state.results.length - 1;
        await interaction.deferUpdate();
        await displayResult(message, state);
      } else if (interaction.customId === "pfp_download") {
        await handleDownload(interaction, state);
      } else if (interaction.customId === "pfp_new_search") {
        await interaction.deferUpdate();
        collector.stop();
        await showMainMenu(interaction, true);
      }
    } catch (error) {
      console.error("Collector error:", error);
      if (!interaction.replied && !interaction.deferred) {
        const errorMessage = error?.message || String(error) || "Unknown error";
        await interaction.reply({
          content: `❌ An error occurred: ${errorMessage}`,
          ephemeral: true,
        }).catch(() => {});
      }
    }
  });

  collector.on("end", () => {
    if (message && message.components) {
      message.edit({ components: InteractionUtils.disableComponents(message.components) }).catch(() => {});
    }
  });
}

/**
 * Handle image download
 */
async function handleDownload(interaction, state) {
  await interaction.deferReply({ ephemeral: true });

  const result = state.results[state.currentIndex];

  if (!result.image || result.isFallback) {
    return interaction.followUp({
      content: "❌ No image available to download.",
      ephemeral: true,
    });
  }

  try {
    const response = await getBuffer(result.image);

    if (!response.success) {
      return interaction.followUp({
        content: "❌ Failed to download image.",
        ephemeral: true,
      });
    }

    const filename = `pfp_${Date.now()}.${result.image.endsWith(".gif") ? "gif" : "png"}`;
    const attachment = new AttachmentBuilder(response.buffer, { name: filename });

    await interaction.followUp({
      content: "✅ Here's your profile picture!",
      files: [attachment],
      ephemeral: true,
    });
  } catch (error) {
    console.error("Download error:", error);
    const errorMessage = error?.message || String(error) || "Unknown error";
    await interaction.followUp({
      content: `❌ Download failed: ${errorMessage}`,
      ephemeral: true,
    });
  }
}
