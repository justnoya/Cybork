const { musicValidations } = require("@helpers/BotUtils");
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
  const player = client.musicManager.getPlayer(guildId);
  
  if (!player || !player.current) {
    return `${emojiManager.getError()} There is no song currently playing!`;
  }

  const trackInfo = player.current.info || player.current;
  const title = trackInfo.title || "Unknown Track";
  
  try {
    player.skip();
    return `${emojiManager.skip} Skipped: **${title}**`;
  } catch (error) {
    return `${emojiManager.getError()} There is no song to skip!`;
  }
}
