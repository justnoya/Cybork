const { musicValidations } = require("@helpers/BotUtils");
const { ApplicationCommandOptionType } = require("discord.js");
const { useMainPlayer } = require("discord-player");
const emojiManager = require("@helpers/EmojiManager");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "volume",
  description: "set the music player volume",
  category: "MUSIC",
  validations: musicValidations,
  command: {
    enabled: true,
    usage: "<1-100>",
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "amount",
        description: "Enter a value to set [0 to 100]",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
    ],
  },

  async messageRun(message, args) {
    const amount = args[0];
    const response = await setVolume(message, amount);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const amount = interaction.options.getInteger("amount");
    const response = await setVolume(interaction, amount);
    await interaction.followUp(response);
  },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
async function setVolume({ client, guildId }, volume) {
  const player = useMainPlayer();
  const queue = player.nodes.get(guildId);
  
  if (!queue || !queue.currentTrack) {
    return `${emojiManager.getError()} No music is currently playing!`;
  }

  if (!volume) {
    const currentVolume = queue.node.volume;
    return `${emojiManager.volume_up} Current volume: **${currentVolume}%**`;
  }

  if (volume < 1 || volume > 100) {
    return `${emojiManager.getError()} Volume must be between 1 and 100!`;
  }

  queue.node.setVolume(volume);
  return `${emojiManager.volume_up} Volume set to **${volume}%**`;
}
