const { ApplicationCommandOptionType } = require("discord.js");
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
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name: "vote_percentage",
        description: "Percentage of votes needed to skip (default: 50%)",
        type: ApplicationCommandOptionType.Integer,
        required: false,
        min_value: 10,
        max_value: 100,
      },
      {
        name: "max_members",
        description: "Maximum members allowed (0 = unlimited)",
        type: ApplicationCommandOptionType.Integer,
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

    const components = [];
    
    components.push(ContainerBuilder.createTextDisplay(
      `# 🎉 Listening Party Created!`
    ));
    
    components.push(ContainerBuilder.createTextDisplay(
      `### 🎵 ${party.name}\n` +
      `**Party ID:** \`${party.partyId}\`\n` +
      `**Host:** @${member.user.username}`
    ));
    
    components.push(ContainerBuilder.createSeparator());
    
    components.push(ContainerBuilder.createTextDisplay(
      `**📍 Voice Channel:** ${member.voice.channel.name}\n` +
      `**👥 Members:** ${party.members.length}\n` +
      `**🗳️ Vote Skip:** ${party.settings.voteSkipPercentage}%\n` +
      `**🎯 Max Members:** ${party.settings.maxMembers || 'Unlimited'}`
    ));
    
    components.push(ContainerBuilder.createSeparator());
    
    components.push(ContainerBuilder.createTextDisplay(
      `### ✨ How to Join\n` +
      `> Others can join with: \`/party-join ${party.partyId}\`\n` +
      `> Or use: \`!party-join ${party.partyId}\`\n\n` +
      `**🎵 Start playing music** with \`/play\` and everyone in the party will hear it synchronized!`
    ));

    const container = new ContainerBuilder()
      .addContainer({ accentColor: 0x8B5CF6, components })
      .build();

    return container;
  } catch (error) {
    client.logger.error("Failed to create party:", error);
    return "❌ Failed to create listening party. Please try again.";
  }
}
