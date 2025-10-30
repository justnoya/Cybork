const { musicValidations } = require("@helpers/BotUtils");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "tremolo",
  description: "toggle tremolo effect (volume oscillation)",
  category: "MUSIC",
  validations: musicValidations,
  command: {
    enabled: true,
  },
  slashCommand: {
    enabled: true,
  },

  async messageRun(message) {
    const response = toggleTremolo(message);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const response = toggleTremolo(interaction);
    await interaction.followUp(response);
  },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
function toggleTremolo({ client, guildId }) {
  const player = client.musicManager.getPlayer(guildId);
  
  if (!player) {
    return "❌ No music is currently playing!";
  }
  
  // Check current state
  const currentFilters = player.filters || {};
  const isTremolo = currentFilters.tremolo;
  
  if (isTremolo) {
    // Disable tremolo
    player.setFilter({ tremolo: null });
    return "🎚️ Tremolo **disabled** - volume stabilized";
  } else {
    // Enable tremolo effect
    player.setFilter({
      tremolo: {
        frequency: 4.0,
        depth: 0.75
      }
    });
    return "🎵 Tremolo **enabled** - wobble effect activated! 🌊";
  }
}
