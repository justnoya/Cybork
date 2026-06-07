const emojiInfo = require("./shared/emoji");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "emojiinfo",
  description: "shows info about an emoji",
  category: "INFORMATION",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    usage: "<emoji>",
    minArgsCount: 1,
    aliases: ["emote", "ei", "emoteinfo"],
  },
  slashCommand: {
    enabled: false,
  },

  async messageRun(message, args) {
    const response = emojiInfo(args[0]);
    await message.safeReply(response);
  },
};
