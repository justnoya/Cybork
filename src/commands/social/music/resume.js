const { musicValidations } = require("@helpers/BotUtils");
const emojiManager = require("@helpers/EmojiManager");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "resume",
  description: "resume the music player",
  category: "MUSIC",
  validations: musicValidations,
  command: {
    enabled: true,
    aliases: ["unpause"],
  },
  slashCommand: {
    enabled: true,
  },

  async messageRun(message, args) {
    const response = resume(message);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const response = resume(interaction);
    await interaction.followUp(response);
  },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
function resume({ client, guildId }) {
  const player = client.musicManager.getPlayer(guildId);
  
  if (!player || !player.current) {
    return `${emojiManager.getError()} No music is currently playing!`;
  }

  if (!player.paused) {
    return `${emojiManager.play} The player is not paused!`;
  }

  player.pause(false);
  return `${emojiManager.play} Resumed the music player!`;
}
