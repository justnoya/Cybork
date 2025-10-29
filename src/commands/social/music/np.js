const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const MusicPlayerView = require("@helpers/MusicPlayerView");
const MusicPlayerCard = require("@helpers/MusicPlayerCard");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "np",
  description: "show's what track is currently being played",
  category: "MUSIC",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    aliases: ["nowplaying"],
  },
  slashCommand: {
    enabled: true,
  },

  async messageRun(message, args) {
    const response = await nowPlaying(message);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const response = await nowPlaying(interaction);
    await interaction.followUp(response);
  },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
async function nowPlaying({ client, guildId, member, author }) {
  const player = client.musicManager.getPlayer(guildId);
  
  if (!player || !player.current) {
    return MusicPlayerView.createEmptyQueueDisplay();
  }

  const track = player.current;
  const requester = track.requester?.username || track.requester || (member?.user?.username ? `${member.user.username}` : (author ? `${author.username}` : "User"));
  
  // Generate beautiful visual card with timeout
  try {
    const cardBuffer = await Promise.race([
      MusicPlayerCard.generateNowPlayingCard(track, player, requester),
      new Promise((resolve) => setTimeout(() => resolve(null), 7000))
    ]);
    
    if (cardBuffer) {
      const attachment = new AttachmentBuilder(cardBuffer, { name: 'now-playing.png' });
      
      // Use new container display with card inside
      const containerDisplay = MusicPlayerView.createNowPlayingWithCard(player, requester, cardBuffer);
      
      return {
        files: [attachment],
        ...containerDisplay
      };
    }
  } catch (error) {
    console.error('Error generating np card:', error.message);
  }
  
  // Fallback to container view if card generation fails
  return MusicPlayerView.createNowPlayingDisplay(player, requester, { member, author }, null);
}
