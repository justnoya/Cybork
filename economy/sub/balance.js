const { EmbedBuilder } = require("discord.js");
const { getUser } = require("@schemas/User");
const { EMBED_COLORS, ECONOMY } = require("@root/config");

module.exports = async (user) => {
  const economy = await getUser(user);

  const embed = new EmbedBuilder()
    .setColor(0xFFFFFF)
    .setAuthor({ 
      name: `${user.username}'s Balance`,
      iconURL: user.displayAvatarURL()
    })
    .setDescription(
      `### Account Summary\n` +
      `> **Wallet:** \`${economy?.coins || 0}${ECONOMY.CURRENCY}\`\n` +
      `> **Bank:** \`${economy?.bank || 0}${ECONOMY.CURRENCY}\`\n` +
      `> **Net Worth:** \`${(economy?.coins || 0) + (economy?.bank || 0)}${ECONOMY.CURRENCY}\``
    )
    .setThumbnail(user.displayAvatarURL())
    .setFooter({ text: "Powered by Blackbit Studio" });

  return { embeds: [embed] };
};
