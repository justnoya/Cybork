const { GuildChannel, ChannelType } = require("discord.js");

// v13 returns string types; v14 returns numbers — handle both
function isTextableChannel(type) {
  return (
    type === "GUILD_TEXT" || type === ChannelType.GuildText || type === 0 ||
    type === "DM"         || type === ChannelType.DM         || type === 1 ||
    type === "GUILD_VOICE"|| type === ChannelType.GuildVoice || type === 2 ||
    type === "GUILD_NEWS" || type === ChannelType.GuildAnnouncement || type === 5
  );
}

function isVoiceChannel(type) {
  return type === "GUILD_VOICE" || type === ChannelType.GuildVoice || type === 2;
}

/**
 * Check if bot has permission to send embeds
 */
GuildChannel.prototype.canSendEmbeds = function () {
  const botMember = this.guild.me || this.guild.members?.me;
  if (!botMember) return false;
  return this.permissionsFor(botMember).has(["ViewChannel", "SendMessages", "EmbedLinks"]);
};

/**
 * Safely send a message to the channel
 * @param {string|import('discord.js').MessagePayload|import('discord.js').MessageOptions} content
 * @param {number} [seconds]
 */
GuildChannel.prototype.safeSend = async function (content, seconds) {
  if (!content) return;
  if (!isTextableChannel(this.type)) return;

  const botMember = this.guild.me || this.guild.members?.me;
  if (botMember) {
    const perms = ["ViewChannel", "SendMessages"];
    if (isVoiceChannel(this.type)) perms.push("Connect");
    if (content.embeds && content.embeds.length > 0) perms.push("EmbedLinks");
    if (!this.permissionsFor(botMember).has(perms)) return;
  }

  try {
    if (!seconds) return await this.send(content);
    const reply = await this.send(content);
    setTimeout(() => reply.deletable && reply.delete().catch(() => {}), seconds * 1000);
  } catch (ex) {
    this.client.logger.error(`safeSend`, ex);
  }
};
