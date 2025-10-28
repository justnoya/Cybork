const ContainerBuilder = require("@helpers/ContainerBuilder");

module.exports = {
  name: "party-end",
  description: "End your listening party (host only)",
  category: "MUSIC",
  command: {
    enabled: true,
    aliases: ["endparty", "partystop"],
  },
  slashCommand: {
    enabled: true,
  },

  async messageRun(message) {
    const response = await endParty(message.member, message.guild);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const response = await endParty(interaction.member, interaction.guild);
    await interaction.followUp(response);
  },
};

async function endParty(member, guild) {
  const client = guild.client;

  try {
    const activeParties = await client.partyManager.getActivePartiesByGuild(guild.id);
    const memberParty = activeParties.find(p => p.hostId === member.id);

    if (!memberParty) {
      return "🚫 You don't have an active party to end! Only the host can end a party.";
    }

    const result = await client.partyManager.endParty(memberParty.partyId);

    if (!result.success) {
      return `🚫 ${result.message}`;
    }

    const party = result.party;
    const duration = Date.now() - party.createdAt.getTime();
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);

    const components = [];
    
    components.push(ContainerBuilder.createTextDisplay(
      `# 🎉 Party Ended!`
    ));
    
    components.push(ContainerBuilder.createTextDisplay(
      `### 🎵 ${party.name}\n` +
      `**Party ID:** \`${party.partyId}\``
    ));
    
    components.push(ContainerBuilder.createSeparator());
    
    components.push(ContainerBuilder.createTextDisplay(
      `**📊 Party Stats**\n` +
      `**⏱️ Duration:** ${hours > 0 ? `${hours}h ` : ''}${minutes}m\n` +
      `**👥 Total Members:** ${party.members.length}\n` +
      `**🎵 Tracks Played:** ${party.queue.length}\n` +
      `**🎤 Host:** @${party.hostUsername}`
    ));
    
    components.push(ContainerBuilder.createSeparator());
    
    components.push(ContainerBuilder.createTextDisplay(
      `**Thanks for listening together!** 🎧\n` +
      `Create another party anytime with \`/party-create\``
    ));

    const container = new ContainerBuilder()
      .addContainer({ accentColor: 0xEF4444, components })
      .build();

    if (party.textChannelId) {
      const textChannel = guild.channels.cache.get(party.textChannelId);
      if (textChannel) {
        textChannel.send(`🎉 **Listening party ended!** Thanks to all ${party.members.length} members for joining!`).catch(() => {});
      }
    }

    return container;
  } catch (error) {
    client.logger.error("Failed to end party:", error);
    return "❌ Failed to end listening party. Please try again.";
  }
}
