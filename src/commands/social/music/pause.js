const { musicValidations } = require("@helpers/BotUtils");
const emojiManager = require("@helpers/EmojiManager");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "pause",
  description: "pause the music player",
  category: "MUSIC",
  validations: musicValidations,
  command: {
    enabled: true,
  },
  slashCommand: {
    enabled: true,
  },

  async messageRun(message, args) {
    const response = pause(message);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const response = pause(interaction);
    await interaction.followUp(response);
  },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
function pause({ client, guildId }) {
  const player = client.musicManager.getPlayer(guildId);
  
  if (!player || !player.current) {
    return `${emojiManager.getError()} No music is currently playing!`;
  }

  if (player.paused) {
    return `${emojiManager.pause} The player is already paused!`;
  }

  player.pause(true);
  return `${emojiManager.pause} Paused the music player!`;
}
