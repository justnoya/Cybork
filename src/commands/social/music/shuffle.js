const { musicValidations } = require("@helpers/BotUtils");
const { useMainPlayer } = require("discord-player");
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
  const player = useMainPlayer();
  const queue = player.nodes.get(guildId);
  
  if (!queue || !queue.currentTrack) {
    return `${emojiManager.getError()} No music is currently playing!`;
  }

  if (queue.tracks.size === 0) {
    return `${emojiManager.getError()} Queue is empty, nothing to shuffle!`;
  }

  queue.tracks.shuffle();
  return `${emojiManager.shuffle} Queue has been shuffled! **${queue.tracks.size}** tracks randomized.`;
}
