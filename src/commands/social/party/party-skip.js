const ContainerBuilder = require("@helpers/ContainerBuilder");

module.exports = {
  name: "party-skip",
  description: "Vote to skip the current song in the party",
  category: "MUSIC",
  command: {
    enabled: true,
    aliases: ["partyskip", "pvote"],
  },
  slashCommand: {
    enabled: true,
  },

  async messageRun(message) {
    const response = await voteSkip(message.member, message.guild);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const response = await voteSkip(interaction.member, interaction.guild);
    await interaction.followUp(response);
  },
};

async function voteSkip(member, guild) {
  const client = guild.client;

  try {
    const activeParties = await client.partyManager.getActivePartiesByGuild(guild.id);
    const party = activeParties.find((p) => p.members.some((m) => m.userId === member.id));

    if (!party) {
      return "🚫 You're not in any listening party!";
    }

    if (!party.currentTrack) {
      return "🚫 No song is currently playing!";
    }

    if (party.hostId === member.id) {
      const player = client.partyManager.getPlayer(party.partyId);
      if (player) {
        player.stop();
      }

      party.votes.skip = [];
      await party.save();

      return "⏭️ **Host skip** - Song skipped!";
    }

    const result = await client.partyManager.voteSkip(party.partyId, member.id);

    if (!result.success) {
      return `🚫 ${result.message}`;
    }

    if (result.skip) {
      const player = client.partyManager.getPlayer(party.partyId);
      if (player) {
        player.stop();
      }

      const components = [];

      components.push(ContainerBuilder.createTextDisplay(`# ⏭️ Song Skipped!`));

      components.push(
        ContainerBuilder.createTextDisplay(
          `**${party.currentTrack.title}** has been skipped!\n\n` +
            `**Votes:** ${result.votes} / ${result.needed}\n` +
            `**Vote Percentage:** ${party.settings.voteSkipPercentage}%`
        )
      );

      const container = new ContainerBuilder().addContainer({ accentColor: 0x10B981, components }).build();

      return container;
    } else {
      const components = [];

      components.push(ContainerBuilder.createTextDisplay(`# 🗳️ Skip Vote Registered`));

      components.push(
        ContainerBuilder.createTextDisplay(
          `Your vote has been counted!\n\n` +
            `**Votes:** ${result.votes} / ${result.needed}\n` +
            `**Needed:** ${party.settings.voteSkipPercentage}% (${result.needed} votes)\n\n` +
            `*${result.needed - result.votes} more vote(s) needed to skip*`
        )
      );

      const container = new ContainerBuilder().addContainer({ accentColor: 0x3B82F6, components }).build();

      return container;
    }
  } catch (error) {
    client.logger.error("Failed to vote skip:", error);
    return "❌ Failed to register skip vote. Please try again.";
  }
}
