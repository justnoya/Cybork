const { musicValidations } = require("@helpers/BotUtils");
const { ApplicationCommandOptionType } = require("discord.js");

const levels = {
  none: 0.0,
  low: 0.15,
  medium: 0.25,
  high: 0.35,
  extreme: 0.50,
  insane: 0.75,
};

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "bassboost",
  description: "set bassboost level",
  category: "MUSIC",
  validations: musicValidations,
  command: {
    enabled: true,
    minArgsCount: 1,
    usage: "<none|low|medium|high|extreme|insane>",
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "level",
        description: "bassboost level",
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          {
            name: "none",
            value: "none",
          },
          {
            name: "low",
            value: "low",
          },
          {
            name: "medium",
            value: "medium",
          },
          {
            name: "high",
            value: "high",
          },
          {
            name: "extreme",
            value: "extreme",
          },
          {
            name: "insane",
            value: "insane",
          },
        ],
      },
    ],
  },

  async messageRun(message, args) {
    let level = "none";
    if (args.length && args[0].toLowerCase() in levels) level = args[0].toLowerCase();
    const response = setBassBoost(message, level);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    let level = interaction.options.getString("level");
    const response = setBassBoost(interaction, level);
    await interaction.followUp(response);
  },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 * @param {number} level
 */
function setBassBoost({ client, guildId }, level) {
  const player = client.musicManager.getPlayer(guildId);
  const gain = levels[level];
  
  // Enhanced bassboost with 5 low-frequency bands for better quality
  const bands = [
    { band: 0, gain: gain },      // 25 Hz
    { band: 1, gain: gain * 0.9 }, // 40 Hz
    { band: 2, gain: gain * 0.8 }, // 63 Hz
    { band: 3, gain: gain * 0.6 }, // 100 Hz
    { band: 4, gain: gain * 0.4 }, // 160 Hz
  ];
  
  player.setEqualizer(...bands);
  
  const emoji = level === 'none' ? '🔇' : level === 'insane' ? '💥' : level === 'extreme' ? '🔥' : '🔊';
  return `${emoji} Set bassboost to **${level.toUpperCase()}** level`;
}
