const { musicValidations } = require("@helpers/BotUtils");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "nightcore",
  description: "toggle nightcore effect (speed up + pitch up)",
  category: "MUSIC",
  validations: musicValidations,
  command: {
    enabled: true,
  },
  slashCommand: {
    enabled: true,
  },

  async messageRun(message) {
    const response = toggleNightcore(message);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const response = toggleNightcore(interaction);
    await interaction.followUp(response);
  },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
function toggleNightcore({ client, guildId }) {
  const player = client.musicManager.getPlayer(guildId);
  
  if (!player) {
    return "❌ No music is currently playing!";
  }
  
  // Check current state
  const currentFilters = player.filters || {};
  const isNightcore = currentFilters.timescale && currentFilters.timescale.speed > 1;
  
  if (isNightcore) {
    // Disable nightcore
    player.setFilter({ timescale: null });
    return "🌙 Nightcore **disabled** - back to normal speed";
  } else {
    // Enable nightcore effect (speed up + pitch up)
    player.setFilter({
      timescale: {
        speed: 1.3,
        pitch: 1.3,
        rate: 1.0
      }
    });
    return "⚡ Nightcore **enabled** - high energy mode! 🔥";
  }
}
