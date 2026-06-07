const { EmbedBuilder } = require("discord.js");
const { EMBED_COLORS } = require("@root/config");

/**
 * @param {import('discord.js').GuildMember} member
 */
module.exports = (member) => {
  let color = member.displayHexColor;
  if (color === "#000000") color = EMBED_COLORS.BOT_EMBED;

  let rolesString = member.roles.cache
    .filter((r) => r.name !== "@everyone")
    .map((r) => `\`${r.name}\``)
    .join(", ");
  if (rolesString.length > 1000) rolesString = rolesString.substring(0, 997) + "...";
  if (!rolesString) rolesString = "No roles";

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: "Username", value: member.user.username, inline: true },
      { name: "User ID", value: `\`${member.id}\``, inline: true },
      { name: "Display Name", value: member.displayName, inline: true },
      { name: "Joined Server", value: `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>`, inline: true },
      { name: "Account Created", value: `<t:${Math.floor(member.user.createdAt.getTime() / 1000)}:F>`, inline: true },
      { name: `Roles [${member.roles.cache.size - 1}]`, value: rolesString }
    )
    .setFooter({ text: `Requested by ${member.user.tag}` })
    .setTimestamp();

  return { embeds: [embed] };
};
