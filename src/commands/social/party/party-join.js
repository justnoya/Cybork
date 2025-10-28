const { ApplicationCommandOptionType } = require("discord.js");
const ContainerBuilder = require("@helpers/ContainerBuilder");

module.exports = {
  name: "party-join",
  description: "Join a listening party",
  category: "MUSIC",
  botPermissions: ["Connect", "Speak"],
  command: {
    enabled: true,
    aliases: ["joinparty"],
    usage: "<party-id>",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "party_id",
        description: "The ID of the party to join",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  async messageRun(message, args) {
    const partyId = args[0];
    const response = await joinParty(message.member, message.guild, partyId);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const partyId = interaction.options.getString("party_id");
    const response = await joinParty(interaction.member, interaction.guild, partyId);
    await interaction.followUp(response);
  },
};

async function joinParty(member, guild, partyId) {
  if (!member.voice.channel) {
    return "🚫 You need to join a voice channel first!";
  }

  const client = guild.client;

  try {
    const result = await client.partyManager.joinParty(partyId, member.user, member.voice.channel);
    
    if (!result.success) {
      return `🚫 ${result.message}`;
    }

    const party = result.party;
    
    const components = [];
    
    components.push(ContainerBuilder.createTextDisplay(
      `# ✅ Joined Listening Party!`
    ));
    
    components.push(ContainerBuilder.createTextDisplay(
      `### 🎵 ${party.name}\n` +
      `**Party ID:** \`${party.partyId}\`\n` +
      `**Host:** @${party.hostUsername}`
    ));
    
    components.push(ContainerBuilder.createSeparator());
    
    components.push(ContainerBuilder.createTextDisplay(
      `**👥 Members:** ${party.members.length}${party.settings.maxMembers > 0 ? ` / ${party.settings.maxMembers}` : ''}\n` +
      `**🗳️ Vote Skip:** ${party.settings.voteSkipPercentage}%\n` +
      `**🎵 Status:** ${party.status === 'active' ? '▶️ Active' : '⏸️ Paused'}`
    ));
    
    if (party.currentTrack) {
      components.push(ContainerBuilder.createSeparator());
      components.push(ContainerBuilder.createTextDisplay(
        `**🎵 Now Playing:** ${party.currentTrack.title}\n` +
        `**🎤 Artist:** ${party.currentTrack.author}`
      ));
    }

    components.push(ContainerBuilder.createSeparator());
    
    components.push(ContainerBuilder.createTextDisplay(
      `**📌 Tip:** Everyone hears the same music at the same time!\n` +
      `Use \`/party-leave\` to exit the party.`
    ));

    const container = new ContainerBuilder()
      .addContainer({ accentColor: 0x10B981, components })
      .build();

    if (party.settings.announceJoins && party.textChannelId) {
      const textChannel = guild.channels.cache.get(party.textChannelId);
      if (textChannel) {
        textChannel.send(`🎉 **@${member.user.username}** joined the party! (${party.members.length} members)`).catch(() => {});
      }
    }

    return container;
  } catch (error) {
    client.logger.error("Failed to join party:", error);
    return "❌ Failed to join listening party. Please check the Party ID and try again.";
  }
}
