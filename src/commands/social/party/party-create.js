const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const ContainerBuilder = require("@helpers/ContainerBuilder");

module.exports = {
  name: "party-create",
  description: "Create a synchronized listening party",
  category: "MUSIC",
  botPermissions: ["Connect", "Speak"],
  command: {
    enabled: true,
    aliases: ["createparty", "partystart"],
    usage: "[party-name]",
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "name",
        description: "Name for your listening party",
        type: 3, // String
        required: false,
      },
      {
        name: "vote_percentage",
        description: "Percentage of votes needed to skip (default: 50%)",
        type: 4, // Integer
        required: false,
        min_value: 10,
        max_value: 100,
      },
      {
        name: "max_members",
        description: "Maximum members allowed (0 = unlimited)",
        type: 4, // Integer
        required: false,
        min_value: 0,
        max_value: 100,
      },
    ],
  },

  async messageRun(message, args) {
    const partyName = args.join(" ") || null;
    const response = await createParty(message.member, message.guild, message.channel, partyName);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const partyName = interaction.options.getString("name") || null;
    const votePercentage = interaction.options.getInteger("vote_percentage") || 50;
    const maxMembers = interaction.options.getInteger("max_members") || 0;

    const response = await createParty(
      interaction.member, 
      interaction.guild, 
      interaction.channel, 
      partyName, 
      { voteSkipPercentage: votePercentage, maxMembers }
    );
    await interaction.followUp(response);
  },
};

async function createParty(member, guild, channel, partyName, options = {}) {
  if (!member.voice.channel) {
    return "🚫 You need to join a voice channel first to create a party!";
  }

  const client = guild.client;
  
  const activeParties = await client.partyManager.getActivePartiesByGuild(guild.id);
  const existingParty = activeParties.find(p => p.hostId === member.id);
  
  if (existingParty) {
    return `🚫 You already have an active party (\`${existingParty.partyId}\`). End it first with \`/party-end\``;
  }

  try {
    const party = await client.partyManager.createParty(
      guild,
      member.user,
      partyName,
      options
    );

    await client.partyManager.connectToVoice(party.partyId, member.voice.channel);

    // Create a beautiful party invitation embed similar to game invitations
    const embed = new EmbedBuilder()
      .setColor(0x5865F2) // Discord blurple color
      .setTitle('🎉 PARTY INVITATION')
      .setDescription(
        `### 🎵 ${party.name}\n\n` +
        `**${member.user.username}** invites you to join their listening party!\n\n` +
        `Listen to music together in perfect sync with your friends.`
      )
      .addFields(
        {
          name: '📍 Voice Channel',
          value: member.voice.channel.name,
          inline: true
        },
        {
          name: '👥 Members',
          value: `${party.members.length}`,
          inline: true
        },
        {
          name: '🗳️ Vote Skip',
          value: `${party.settings.voteSkipPercentage}%`,
          inline: true
        }
      )
      .setFooter({ 
        text: `Party ID: ${party.partyId} • Join now to start listening together!` 
      })
      .setTimestamp();

    // Create Join button (like the "Play" button in game invitations)
    const joinButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`party_join:${party.partyId}`)
        .setLabel('Join')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎵')
    );

    return {
      embeds: [embed],
      components: [joinButton]
    };
  } catch (error) {
    client.logger.error("Failed to create party:", error);
    return "❌ Failed to create listening party. Please try again.";
  }
}
