const { purgeMessages } = require("@helpers/ModUtils");
const { EmbedBuilder } = require("discord.js");
const { EMBED_COLORS } = require("@root/config");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "purge",
  description: "deletes the specified amount of messages",
  category: "MODERATION",
  userPermissions: ["ManageMessages"],
  botPermissions: ["ManageMessages", "ReadMessageHistory"],
  command: {
    enabled: true,
    usage: "<amount>",
    minArgsCount: 1,
    aliases: ["clear", "clean", "prune"],
  },
  slashCommand: {
    enabled: false,
  },

  async messageRun(message, args) {
    const amount = parseInt(args[0]);
    if (isNaN(amount)) return message.safeReply("Numbers are only allowed");
    if (amount > 99) return message.safeReply("The max amount of messages I can delete is 99");

    const { channel } = message;
    const response = await purgeMessages(message.member, channel, "ALL", amount + 1);

    if (typeof response === "number") {
      const embed = new EmbedBuilder().setColor(EMBED_COLORS.SUCCESS).setDescription(`Successfully deleted **${response}** messages`).setTimestamp();
      return channel.send({ embeds: [embed] }).then((msg) => setTimeout(() => msg.delete().catch(() => {}), 5000));
    } else if (response === "BOT_PERM") {
      return message.safeReply("I don't have `Read Message History` & `Manage Messages` permissions");
    } else if (response === "MEMBER_PERM") {
      return message.safeReply("You don't have `Read Message History` & `Manage Messages` permissions");
    } else if (response === "NO_MESSAGES") {
      return channel.send("No messages found that can be cleaned").then((msg) => setTimeout(() => msg.delete().catch(() => {}), 5000));
    } else {
      return message.safeReply("Error occurred! Failed to delete messages");
    }
  },
};
