const { musicValidations } = require("@helpers/BotUtils");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "vaporwave",
  description: "toggle vaporwave effect (slow down + pitch down)",
  category: "MUSIC",
  validations: musicValidations,
  command: {
    enabled: true,
  },
  slashCommand: {
    enabled: true,
  },

  async messageRun(message) {
    const response = toggleVaporwave(message);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const response = toggleVaporwave(interaction);
    await interaction.followUp(response);
  },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
function toggleVaporwave({ client, guildId }) {
  const player = client.musicManager.getPlayer(guildId);
  
  if (!player) {
    return "❌ No music is currently playing!";
  }
  
  // Check current state
  const currentFilters = player.filters || {};
  const isVaporwave = currentFilters.timescale && currentFilters.timescale.speed < 1;
  
  if (isVaporwave) {
    // Disable vaporwave
    player.setFilter({ timescale: null });
    return "🌊 Vaporwave **disabled** - back to normal";
  } else {
    // Enable vaporwave effect (slow down + pitch down)
    player.setFilter({
      timescale: {
        speed: 0.8,
        pitch: 0.8,
        rate: 1.0
      }
    });
    return "🌴 Vaporwave **enabled** - chill vibes activated! ✨";
  }
}
