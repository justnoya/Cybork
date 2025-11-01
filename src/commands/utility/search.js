const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const InteractionUtils = require("@helpers/InteractionUtils");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "search",
  description: "Search the internet for information",
  category: "UTILITY",
  botPermissions: ["EmbedLinks"],
  cooldown: 5,
  command: {
    enabled: false,
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "query",
        description: "What would you like to search for?",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "provider",
        description: "Search provider to use",
        type: ApplicationCommandOptionType.String,
        required: false,
        choices: [
          { name: "Auto - Best available", value: "auto" },
          { name: "Wikipedia", value: "wikipedia" },
          { name: "DuckDuckGo", value: "duckduckgo" },
        ],
      },
    ],
  },

  async interactionRun(interaction) {
    const query = interaction.options.getString("query");
    const provider = interaction.options.getString("provider") || "auto";

    await interaction.deferReply();

    try {
      const startTime = Date.now();
      const result = await interaction.client.processors.search(query, { provider });
      const searchTime = Date.now() - startTime;

      if (!result.answer && !result.summary) {
        return interaction.editReply({
          embeds: [
            InteractionUtils.createErrorEmbed(
              "No results found for that query. Try using different keywords."
            ),
          ],
        });
      }

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(`🔍 ${result.title || query}`)
        .setDescription(result.answer || result.summary)
        .setFooter({
          text: `Powered by ${result.provider} • Search took ${searchTime}ms`,
        })
        .setTimestamp();

      if (result.url) {
        embed.setURL(result.url);
        embed.addFields({
          name: "📖 Learn More",
          value: `[Read full article](${result.url})`,
        });
      }

      if (result.thumbnail) {
        embed.setThumbnail(result.thumbnail);
      }

      if (result.source) {
        embed.addFields({
          name: "📚 Source",
          value: result.source,
          inline: true,
        });
      }

      if (result.relatedTopics && result.relatedTopics.length > 0) {
        const topics = result.relatedTopics
          .slice(0, 5)
          .map((topic) => topic.Text || topic.FirstURL)
          .filter(Boolean)
          .join("\n• ");

        if (topics) {
          embed.addFields({
            name: "🔗 Related Topics",
            value: "• " + topics,
          });
        }
      }

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      interaction.client.logger.error("Search command error:", error);

      if (error.message.includes("Rate limit")) {
        return interaction.editReply({
          embeds: [
            InteractionUtils.createErrorEmbed(
              "⏱️ Rate limit reached. Please wait a moment before searching again."
            ),
          ],
        });
      }

      return interaction.editReply({
        embeds: [
          InteractionUtils.createErrorEmbed(
            "Failed to perform search. Please try again later."
          ),
        ],
      });
    }
  },
};
