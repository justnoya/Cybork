const ContainerBuilder = require("@helpers/ContainerBuilder");

async function handlePartyJoinButton(client, interaction, partyId) {
  await interaction.deferReply({ ephemeral: true });

  const party = await client.partyManager.getParty(partyId);
  if (!party) {
    return interaction.editReply("🚫 This party has ended or doesn't exist!");
  }

  const member = interaction.member;

  // Check if already in party
  const isMember = party.members.some((m) => m.userId === member.id);
  if (isMember) {
    return interaction.editReply("✅ You're already in this party!");
  }

  // Check if member is in a voice channel
  if (!member.voice.channel) {
    return interaction.editReply("🚫 You need to join a voice channel first!");
  }

  // Check if party is full
  if (party.settings.maxMembers > 0 && party.members.length >= party.settings.maxMembers) {
    return interaction.editReply(`🚫 This party is full! (${party.members.length}/${party.settings.maxMembers})`);
  }

  // CRITICAL FIX: Verify member is in the party's voice channel (don't move the party to their channel!)
  if (!party.voiceChannelId) {
    return interaction.editReply("🚫 This party doesn't have an active voice channel!");
  }

  if (member.voice.channelId !== party.voiceChannelId) {
    // Get the party's voice channel to show in error message
    const partyVoiceChannel = await client.channels.fetch(party.voiceChannelId).catch(() => null);
    const channelName = partyVoiceChannel ? partyVoiceChannel.name : "the party's voice channel";
    
    return interaction.editReply(
      `🚫 You must join **${channelName}** to join this party!\n\n` +
      `The party is already active in that channel. Join the channel first, then click Join again.`
    );
  }

  try {
    // Join the party (without reconnecting - they're already in the right channel)
    const result = await client.partyManager.joinParty(party.partyId, member.user, null);
    
    if (!result.success) {
      return interaction.editReply(`🚫 ${result.message}`);
    }

    const components = [];
    
    components.push(ContainerBuilder.createTextDisplay(
      `# 🎉 Joined Party!\n\n` +
      `### 🎵 ${party.name}\n` +
      `You've successfully joined the listening party!`
    ));
    
    components.push(ContainerBuilder.createSeparator());
    
    components.push(ContainerBuilder.createTextDisplay(
      `**👥 Members:** ${party.members.length + 1}${party.settings.maxMembers > 0 ? ` / ${party.settings.maxMembers}` : ""}\n` +
      `**📍 Voice Channel:** ${member.voice.channel.name}\n` +
      `**🎤 Host:** @${party.hostUsername}`
    ));
    
    const container = new ContainerBuilder()
      .addContainer({ accentColor: 0x10B981, components })
      .build();
    
    return interaction.editReply(container);
  } catch (error) {
    client.logger.error("Failed to join party:", error);
    return interaction.editReply("❌ Failed to join the party. Please try again.");
  }
}

async function handlePartySkipButton(client, interaction, partyId) {
  await interaction.deferReply({ ephemeral: true });

  const party = await client.partyManager.getParty(partyId);
  if (!party) {
    return interaction.editReply("🚫 This party has ended!");
  }

  const member = interaction.member;
  const isMember = party.members.some((m) => m.userId === member.id);

  if (!isMember) {
    return interaction.editReply("🚫 You're not in this party!");
  }

  if (!party.currentTrack) {
    return interaction.editReply("🚫 No song is currently playing!");
  }

  if (party.hostId === member.id) {
    const player = client.partyManager.getPlayer(party.partyId);
    if (player) {
      player.stop();
    }

    party.votes.skip = [];
    await party.save();

    return interaction.editReply("⏭️ **Host skip** - Song skipped!");
  }

  const result = await client.partyManager.voteSkip(party.partyId, member.id);

  if (result.skip) {
    const player = client.partyManager.getPlayer(party.partyId);
    if (player) {
      player.stop();
    }

    return interaction.editReply(
      `⏭️ **Song skipped!**\n\n**Votes:** ${result.votes} / ${result.needed}`
    );
  } else {
    return interaction.editReply(
      `🗳️ **Vote registered!**\n\n**Votes:** ${result.votes} / ${result.needed}\n*${result.needed - result.votes} more vote(s) needed*`
    );
  }
}

async function handlePartyInfoButton(client, interaction, partyId) {
  await interaction.deferReply({ ephemeral: true });

  const party = await client.partyManager.getParty(partyId);
  if (!party) {
    return interaction.editReply("🚫 This party has ended!");
  }

  const components = [];

  components.push(ContainerBuilder.createTextDisplay(`# 🎵 ${party.name}\n\n**Party ID:** \`${party.partyId}\``));

  components.push(ContainerBuilder.createSeparator());

  components.push(
    ContainerBuilder.createTextDisplay(
      `**👥 Members:** ${party.members.length}${party.settings.maxMembers > 0 ? ` / ${party.settings.maxMembers}` : ""}\n` +
        `**🎤 Host:** @${party.hostUsername}\n` +
        `**🗳️ Vote Skip:** ${party.settings.voteSkipPercentage}%\n` +
        `**📊 Queue:** ${party.queue.length} tracks`
    )
  );

  if (party.currentTrack) {
    components.push(ContainerBuilder.createSeparator());
    components.push(
      ContainerBuilder.createTextDisplay(
        `**🎵 Now Playing:**\n${party.currentTrack.title}\n*${party.currentTrack.author}*`
      )
    );
  }

  const container = new ContainerBuilder().addContainer({ accentColor: 0x3B82F6, components }).build();

  return interaction.editReply(container);
}

async function handlePartyQueueButton(client, interaction, partyId) {
  await interaction.deferReply({ ephemeral: true });

  const party = await client.partyManager.getParty(partyId);
  if (!party) {
    return interaction.editReply("🚫 This party has ended!");
  }

  const components = [];

  components.push(ContainerBuilder.createTextDisplay(`# 📋 Party Queue\n\n**${party.queue.length} tracks in queue**`));

  if (party.currentTrack) {
    components.push(ContainerBuilder.createSeparator());
    components.push(
      ContainerBuilder.createTextDisplay(
        `**🎵 Now Playing:**\n${party.currentTrack.title}\n*${party.currentTrack.author}*`
      )
    );
  }

  if (party.queue.length > 0) {
    components.push(ContainerBuilder.createSeparator());

    const queueList = party.queue
      .slice(0, 10)
      .map((t, i) => `**${i + 1}.** ${t.title.substring(0, 40)}\n     *${t.author}* • Requested by @${t.requestedBy}`)
      .join("\n\n");

    components.push(ContainerBuilder.createTextDisplay(queueList + (party.queue.length > 10 ? `\n\n*+${party.queue.length - 10} more tracks*` : "")));
  } else {
    components.push(ContainerBuilder.createSeparator());
    components.push(ContainerBuilder.createTextDisplay("*Queue is empty*\nAdd songs with `/party-play <song>`"));
  }

  const container = new ContainerBuilder().addContainer({ accentColor: 0x8B5CF6, components }).build();

  return interaction.editReply(container);
}

module.exports = {
  init(client) {
    client.interactionRouter.registerComponent("party", "join", async (interaction, data) => {
      await handlePartyJoinButton(client, interaction, data);
    });

    client.interactionRouter.registerComponent("party", "skip", async (interaction, data) => {
      await handlePartySkipButton(client, interaction, data);
    });

    client.interactionRouter.registerComponent("party", "info", async (interaction, data) => {
      await handlePartyInfoButton(client, interaction, data);
    });

    client.interactionRouter.registerComponent("party", "queue", async (interaction, data) => {
      await handlePartyQueueButton(client, interaction, data);
    });

    client.logger.log("Party Interaction Router initialized");
  },
};
