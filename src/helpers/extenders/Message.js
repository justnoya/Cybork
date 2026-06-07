const { Message } = require("discord.js");

/**
 * @param {string|import('discord.js').MessagePayload|import('discord.js').MessageOptions} content
 * @param {number} [seconds]
 */
Message.prototype.safeReply = async function (content, seconds) {
  if (!content) return;

  // v13: guild.me | v14: guild.members.me
  const botMember = this.guild ? (this.guild.me || this.guild.members?.me) : null;
  const isDM = this.channel.type === "DM" || this.channel.type === 1;

  if (!isDM && botMember) {
    const perms = ["ViewChannel", "SendMessages"];
    if (content.embeds && content.embeds.length > 0) perms.push("EmbedLinks");
    if (!this.channel.permissionsFor(botMember).has(perms)) return;

    const readPerms = [...perms, "ReadMessageHistory"];
    if (!this.channel.permissionsFor(botMember).has(readPerms)) {
      return this.channel.safeSend(content, seconds);
    }
  }

  try {
    if (!seconds) return await this.reply(content);
    const reply = await this.reply(content);
    setTimeout(() => reply.deletable && reply.delete().catch(() => {}), seconds * 1000);
  } catch (ex) {
    try {
      return await this.channel.send(content);
    } catch (ex2) {
      this.client.logger.error(`safeReply`, ex2);
    }
  }
};
