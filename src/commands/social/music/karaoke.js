const { musicValidations } = require("@helpers/BotUtils");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "karaoke",
  description: "toggle karaoke mode (removes vocals)",
  category: "MUSIC",
  validations: musicValidations,
  command: {
    enabled: true,
  },
  slashCommand: {
    enabled: true,
  },

  async messageRun(message) {
    const response = toggleKaraoke(message);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const response = toggleKaraoke(interaction);
    await interaction.followUp(response);
  },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
function toggleKaraoke({ client, guildId }) {
  const player = client.musicManager.getPlayer(guildId);
  
  // Check current state
  const currentFilters = player.filters || {};
  const isKaraoke = currentFilters.karaoke;
  
  if (isKaraoke) {
    // Disable karaoke
    player.setFilters({});
    return "🎤 Karaoke mode **disabled** - vocals restored";
  } else {
    // Enable karaoke mode (removes vocals)
    player.setFilters({
      karaoke: {
        level: 1.0,
        monoLevel: 1.0,
        filterBand: 220.0,
        filterWidth: 100.0
      }
    });
    return "🎤 Karaoke mode **enabled** - vocals removed! Sing along! 🎶";
  }
}
