const { musicValidations } = require("@helpers/BotUtils");
const emojiManager = require("@helpers/EmojiManager");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "stop",
  description: "stop the music player",
  category: "MUSIC",
  validations: musicValidations,
  command: {
    enabled: true,
    aliases: ["leave"],
  },
  slashCommand: {
    enabled: true,
  },

  async messageRun(message, args) {
    const response = await stop(message);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const response = await stop(interaction);
    await interaction.followUp(response);
  },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
async function stop({ client, guildId }) {
  const player = client.musicManager.getPlayer(guildId);
  
  if (!player || !player.current) {
    return `${emojiManager.getError()} No music is currently playing!`;
  }

  player.destroy();
  return `${emojiManager.stop} Music player stopped and queue cleared!`;
}
