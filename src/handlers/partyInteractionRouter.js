const ContainerBuilder = require("@helpers/ContainerBuilder");

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
