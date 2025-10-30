const { musicValidations } = require("@helpers/BotUtils");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "8d",
  description: "toggle 8D audio effect (immersive surround sound)",
  category: "MUSIC",
  validations: musicValidations,
  command: {
    enabled: true,
  },
  slashCommand: {
    enabled: true,
  },

  async messageRun(message) {
    const response = toggle8D(message);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const response = toggle8D(interaction);
    await interaction.followUp(response);
  },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
function toggle8D({ client, guildId }) {
  const player = client.musicManager.getPlayer(guildId);
  
  if (!player) {
    return "❌ No music is currently playing!";
  }
  
  // Check current state
  const currentFilters = player.filters || {};
  const is8D = currentFilters.rotation;
  
  if (is8D) {
    // Disable 8D - clear all filters
    player.setFilter({ rotation: null });
    return "🔊 8D audio **disabled** - back to normal";
  } else {
    // Enable 8D audio effect (rotation creates surround sound effect)
    player.setFilter({
      rotation: {
        rotationHz: 0.2
      }
    });
    return "🎧 8D audio **enabled** - put on headphones for immersive experience! ✨";
  }
}
