const { musicValidations } = require("@helpers/BotUtils");
const { useMainPlayer } = require("discord-player");
const emojiManager = require("@helpers/EmojiManager");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "skip",
  description: "skip the current song",
  category: "MUSIC",
  validations: musicValidations,
  command: {
    enabled: true,
    aliases: ["next"],
  },
  slashCommand: {
    enabled: true,
  },

  async messageRun(message, args) {
    const response = await skip(message);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const response = await skip(interaction);
    await interaction.followUp(response);
  },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
async function skip({ client, guildId }) {
  const player = useMainPlayer();
  const queue = player.nodes.get(guildId);
  
  if (!queue || !queue.currentTrack) {
    return `${emojiManager.getError()} There is no song currently playing!`;
  }

  const title = queue.currentTrack.title || "Unknown Track";
  
  try {
    queue.node.skip();
    return `${emojiManager.skip} Skipped: **${title}**`;
  } catch (error) {
    return `${emojiManager.getError()} There is no song to skip!`;
  }
}
