const { musicValidations } = require("@helpers/BotUtils");
const { ApplicationCommandOptionType } = require("discord.js");
const { useMainPlayer, QueueRepeatMode } = require("discord-player");
const emojiManager = require("@helpers/EmojiManager");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "loop",
  description: "loops the song or queue",
  category: "MUSIC",
  validations: musicValidations,
  command: {
    enabled: true,
    minArgsCount: 1,
    usage: "<queue|track|off>",
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "type",
        type: ApplicationCommandOptionType.String,
        description: "The entity you want to loop",
        required: false,
        choices: [
          {
            name: "queue",
            value: "queue",
          },
          {
            name: "track",
            value: "track",
          },
          {
            name: "off",
            value: "off",
          },
        ],
      },
    ],
  },

  async messageRun(message, args) {
    const input = args[0].toLowerCase();
    const type = input === "queue" ? "queue" : input === "off" ? "off" : "track";
    const response = toggleLoop(message, type);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const type = interaction.options.getString("type") || "track";
    const response = toggleLoop(interaction, type);
    await interaction.followUp(response);
  },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 * @param {"queue"|"track"|"off"} type
 */
function toggleLoop({ client, guildId }, type) {
  const player = useMainPlayer();
  const queue = player.nodes.get(guildId);
  
  if (!queue || !queue.currentTrack) {
    return `${emojiManager.getError()} No music is currently playing!`;
  }

  if (type === "track") {
    queue.setRepeatMode(QueueRepeatMode.TRACK);
    return `${emojiManager.repeat} Loop mode set to: **Track** 🔂`;
  } else if (type === "queue") {
    queue.setRepeatMode(QueueRepeatMode.QUEUE);
    return `${emojiManager.repeat} Loop mode set to: **Queue** 🔁`;
  } else if (type === "off") {
    queue.setRepeatMode(QueueRepeatMode.OFF);
    return `${emojiManager.repeat} Loop mode: **Off** ➡️`;
  }
}
