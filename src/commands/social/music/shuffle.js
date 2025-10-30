const { musicValidations } = require("@helpers/BotUtils");
const emojiManager = require("@helpers/EmojiManager");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "shuffle",
  description: "shuffle the queue",
  category: "MUSIC",
  validations: musicValidations,
  command: {
    enabled: true,
  },
  slashCommand: {
    enabled: true,
  },

  async messageRun(message, args) {
    const response = shuffle(message);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const response = shuffle(interaction);
    await interaction.followUp(response);
  },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
function shuffle({ client, guildId }) {
  const player = client.musicManager.getPlayer(guildId);
  
  if (!player || !player.current) {
    return `${emojiManager.getError()} No music is currently playing!`;
  }

  if (!player.queue || player.queue.length === 0) {
    return `${emojiManager.getError()} Queue is empty, nothing to shuffle!`;
  }

  player.queue.shuffle();
  return `${emojiManager.shuffle} Queue has been shuffled! **${player.queue.length}** tracks randomized.`;
}
