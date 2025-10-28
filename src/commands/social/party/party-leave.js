const ContainerBuilder = require("@helpers/ContainerBuilder");

module.exports = {
  name: "party-leave",
  description: "Leave the current listening party",
  category: "MUSIC",
  command: {
    enabled: true,
    aliases: ["leaveparty"],
  },
  slashCommand: {
    enabled: true,
  },

  async messageRun(message) {
    const response = await leaveParty(message.member, message.guild);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const response = await leaveParty(interaction.member, interaction.guild);
    await interaction.followUp(response);
  },
};

async function leaveParty(member, guild) {
  const client = guild.client;

  try {
    const activeParties = await client.partyManager.getActivePartiesByGuild(guild.id);
    const memberParty = activeParties.find(p => p.members.some(m => m.userId === member.id));

    if (!memberParty) {
      return "🚫 You're not in any active party!";
    }

    const result = await client.partyManager.leaveParty(memberParty.partyId, member.id);

    if (!result.success) {
      return `🚫 ${result.message}`;
    }

    const components = [];
    
    components.push(ContainerBuilder.createTextDisplay(
      `# 👋 Left Listening Party`
    ));
    
    components.push(ContainerBuilder.createTextDisplay(
      `You've successfully left **${memberParty.name}**\n\n` +
      `**Party ID:** \`${memberParty.partyId}\``
    ));
    
    if (result.party && result.party.members.length > 0) {
      components.push(ContainerBuilder.createSeparator());
      components.push(ContainerBuilder.createTextDisplay(
        `**👥 Members remaining:** ${result.party.members.length}\n` +
        `**🎤 New host:** ${result.party.hostId === member.id ? 'You were the host, transferred to another member' : `@${result.party.hostUsername}`}`
      ));
    } else if (!result.party || result.party.members.length === 0) {
      components.push(ContainerBuilder.createSeparator());
      components.push(ContainerBuilder.createTextDisplay(
        `**⚠️ Party ended** - You were the last member`
      ));
    }

    const container = new ContainerBuilder()
      .addContainer({ accentColor: 0xF59E0B, components })
      .build();

    if (memberParty.settings.announceJoins && memberParty.textChannelId) {
      const textChannel = guild.channels.cache.get(memberParty.textChannelId);
      if (textChannel && result.party && result.party.members.length > 0) {
        textChannel.send(`👋 **@${member.user.username}** left the party. (${result.party.members.length} members remaining)`).catch(() => {});
      }
    }

    return container;
  } catch (error) {
    client.logger.error("Failed to leave party:", error);
    return "❌ Failed to leave listening party. Please try again.";
  }
}
