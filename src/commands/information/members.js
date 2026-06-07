const { EmbedBuilder } = require("discord.js");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "members",
  description: "shows member count and statistics for the server",
  category: "INFORMATION",
  botPermissions: ["EmbedLinks"],
  cooldown: 5,
  command: {
    enabled: true,
    aliases: ["membercount", "mc", "memberstats"],
  },
  slashCommand: {
    enabled: false,
  },

  async messageRun(message) {
    const { guild } = message;
    const memberCache = guild.members.cache;
    const totalMembers = guild.memberCount;
    const bots = memberCache.filter((m) => m.user.bot).size;
    const users = memberCache.size - bots;

    const onlineUsers = memberCache.filter((m) => !m.user.bot && m.presence?.status === "online").size;
    const idleUsers = memberCache.filter((m) => !m.user.bot && m.presence?.status === "idle").size;
    const dndUsers = memberCache.filter((m) => !m.user.bot && m.presence?.status === "dnd").size;
    const offlineUsers = users - (onlineUsers + idleUsers + dndUsers);

    const embed = new EmbedBuilder()
      .setColor(0xffffff)
      .setAuthor({ name: `${guild.name} Member Statistics`, iconURL: guild.iconURL() })
      .setThumbnail(guild.iconURL())
      .addFields(
        {
          name: "Total Members",
          value: `> **Total:** \`${totalMembers}\`\n> **Humans:** \`${users}\`\n> **Bots:** \`${bots}\``,
          inline: true,
        },
        {
          name: "Member Status",
          value: `> 🟢 **Online:** \`${onlineUsers}\`\n> 🟡 **Idle:** \`${idleUsers}\`\n> 🔴 **DND:** \`${dndUsers}\`\n> ⚫ **Offline:** \`${offlineUsers}\``,
          inline: true,
        }
      )
      .setFooter({ text: "Powered by Blackbit Studio" })
      .setTimestamp();

    await message.safeReply({ embeds: [embed] });
  },
};
