const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const { EMBED_COLORS } = require("@root/config.js");
const { translate } = require("@helpers/HttpUtils");
const { GOOGLE_TRANSLATE } = require("@src/data.json");
const ModernEmbed = require("@helpers/ModernEmbed");
const emojis = require("@root/emojis.json");

const choices = ["ar", "cs", "de", "en", "fa", "fr", "hi", "hr", "it", "ja", "ko", "la", "nl", "pl", "ta", "te"];

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "translate",
  description: "translate from one language to other",
  cooldown: 20,
  category: "UTILITY",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: false,
    aliases: ["tr"],
    usage: "<iso-code> <message>",
    minArgsCount: 2,
  },
  slashCommand: {
    enabled: false,
    options: [
      {
        name: "language",
        description: "translation language",
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: choices.map((choice) => ({ name: GOOGLE_TRANSLATE[choice], value: choice })),
      },
      {
        name: "text",
        description: "the text that requires translation",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  async messageRun(message, args) {
    const outputCode = args.shift();

    if (!GOOGLE_TRANSLATE[outputCode]) {
      return message.safeReply(
        ModernEmbed.simpleError(
          "Invalid translation code. Visit [here](https://cloud.google.com/translate/docs/languages) to see list of supported translation codes"
        )
      );
    }

    const input = args.join(" ");
    if (!input) return message.safeReply(ModernEmbed.simpleError("Please provide some text to translate"));

    const response = await getTranslation(message.author, input, outputCode);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const outputCode = interaction.options.getString("language");
    const input = interaction.options.getString("text");
    const response = await getTranslation(interaction.user, input, outputCode);
    await interaction.followUp(response);
  },
};

async function getTranslation(author, input, outputCode) {
  const data = await translate(input, outputCode);
  if (!data) return ModernEmbed.simpleError("Failed to translate your text. Please try again later.");

  const embed = new EmbedBuilder()
    .setAuthor({
      name: `${author.username} says`,
      iconURL: author.avatarURL(),
    })
    .setColor(0xFFFFFF)
    .setDescription(`### Translation\n> ${data.output}`)
    .setFooter({ text: `${data.inputLang} (${data.inputCode}) → ${data.outputLang} (${data.outputCode})` });

  return { embeds: [embed] };
}
