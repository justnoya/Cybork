const { ApplicationCommandOptionType } = require("discord.js");
const ContainerBuilder = require("@helpers/ContainerBuilder");
const prettyMs = require("pretty-ms");

module.exports = {
  name: "party-info",
  description: "View information about a listening party",
  category: "MUSIC",
  command: {
    enabled: true,
    aliases: ["partyinfo", "party"],
    usage: "[party-id]",
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "party_id",
        description: "The ID of the party (leave empty for your current party)",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },

  async messageRun(message, args) {
    const partyId = args[0] || null;
    const response = await getPartyInfo(message.member, message.guild, partyId);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const partyId = interaction.options.getString("party_id") || null;
    const response = await getPartyInfo(interaction.member, interaction.guild, partyId);
    await interaction.followUp(response);
  },
};

async function getPartyInfo(member, guild, partyId) {
  const client = guild.client;

  try {
    let party;
    
    if (partyId) {
      party = await client.partyManager.getParty(partyId);
    } else {
      const activeParties = await client.partyManager.getActivePartiesByGuild(guild.id);
      party = activeParties.find(p => p.members.some(m => m.userId === member.id));
    }

    if (!party) {
      return partyId 
        ? "🚫 Party not found or has ended!" 
        : "🚫 You're not in any active party! Provide a Party ID to view specific party info.";
    }

    const components = [];
    
    const statusEmoji = party.status === 'active' ? '▶️' : party.status === 'paused' ? '⏸️' : '⏹️';
    
    components.push(ContainerBuilder.createTextDisplay(
      `# ${statusEmoji} ${party.name}`
    ));
    
    components.push(ContainerBuilder.createTextDisplay(
      `**Party ID:** \`${party.partyId}\`\n` +
      `**Host:** @${party.hostUsername}\n` +
      `**Status:** ${party.status.charAt(0).toUpperCase() + party.status.slice(1)}`
    ));
    
    components.push(ContainerBuilder.createSeparator());
    
    const voiceChannel = guild.channels.cache.get(party.voiceChannelId);
    const uptime = prettyMs(Date.now() - party.createdAt.getTime(), { compact: true });
    
    components.push(ContainerBuilder.createTextDisplay(
      `**📍 Voice Channel:** ${voiceChannel ? voiceChannel.name : 'Unknown'}\n` +
      `**👥 Members:** ${party.members.length}${party.settings.maxMembers > 0 ? ` / ${party.settings.maxMembers}` : ''}\n` +
      `**⏱️ Duration:** ${uptime}\n` +
      `**🗳️ Vote Skip:** ${party.settings.voteSkipPercentage}%`
    ));

    if (party.currentTrack) {
      components.push(ContainerBuilder.createSeparator());
      
      const elapsed = Date.now() - new Date(party.currentTrack.startedAt).getTime();
      const elapsedStr = prettyMs(elapsed, { colonNotation: true });
      const durationStr = prettyMs(party.currentTrack.duration, { colonNotation: true });
      
      components.push(ContainerBuilder.createTextDisplay(
        `### 🎵 Now Playing\n` +
        `**${party.currentTrack.title}**\n` +
        `${party.currentTrack.author} • \`${elapsedStr}\` / \`${durationStr}\``
      ));
    }

    if (party.queue.length > 0) {
      components.push(ContainerBuilder.createSeparator());
      
      const queuePreview = party.queue.slice(0, 3).map((track, i) => 
        `**${i + 1}.** ${track.title.substring(0, 40)} - ${track.author.substring(0, 25)}`
      ).join('\n');
      
      components.push(ContainerBuilder.createTextDisplay(
        `### 📋 Queue (${party.queue.length} tracks)\n` +
        queuePreview +
        (party.queue.length > 3 ? `\n*+${party.queue.length - 3} more...*` : '')
      ));
    }

    if (party.members.length > 0) {
      components.push(ContainerBuilder.createSeparator());
      
      const membersList = party.members.slice(0, 8).map((m, i) => 
        `${m.userId === party.hostId ? '👑' : '👤'} @${m.username}`
      ).join(', ');
      
      components.push(ContainerBuilder.createTextDisplay(
        `**🎭 Members:** ${membersList}` +
        (party.members.length > 8 ? ` *+${party.members.length - 8} more*` : '')
      ));
    }

    components.push(ContainerBuilder.createSeparator());
    
    components.push(ContainerBuilder.createTextDisplay(
      `**⚙️ Settings**\n` +
      `${party.settings.allowGuestControl ? '✅' : '❌'} Guest Control\n` +
      `${party.settings.autoplay ? '✅' : '❌'} Autoplay\n` +
      `${party.settings.announceJoins ? '✅' : '❌'} Announce Joins`
    ));

    const container = new ContainerBuilder()
      .addContainer({ accentColor: 0x3B82F6, components })
      .build();

    return container;
  } catch (error) {
    client.logger.error("Failed to get party info:", error);
    return "❌ Failed to retrieve party information.";
  }
}
