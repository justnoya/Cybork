const { musicValidations } = require("@helpers/BotUtils");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "distortion",
  description: "toggle distortion effect (hard rock sound)",
  category: "MUSIC",
  validations: musicValidations,
  command: {
    enabled: true,
  },
  slashCommand: {
    enabled: true,
  },

  async messageRun(message) {
    const response = toggleDistortion(message);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const response = toggleDistortion(interaction);
    await interaction.followUp(response);
  },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
function toggleDistortion({ client, guildId }) {
  const player = client.musicManager.getPlayer(guildId);
  
  if (!player) {
    return "❌ No music is currently playing!";
  }
  
  // Check current state
  const currentFilters = player.filters || {};
  const isDistortion = currentFilters.distortion;
  
  if (isDistortion) {
    // Disable distortion
    player.setFilter({ distortion: null });
    return "🎸 Distortion **disabled** - clean audio restored";
  } else {
    // Enable distortion effect
    player.setFilter({
      distortion: {
        sinOffset: 0.0,
        sinScale: 1.0,
        cosOffset: 0.0,
        cosScale: 1.0,
        tanOffset: 0.0,
        tanScale: 1.0,
        offset: 0.0,
        scale: 1.2
      }
    });
    return "🤘 Distortion **enabled** - rock mode activated! 🎸";
  }
}
