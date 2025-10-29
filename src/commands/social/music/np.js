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
  
  if (!player || !player.queue.current) {
    return MusicPlayerView.createEmptyQueueDisplay();
  }

  const track = player.queue.current;
  const requester = track.requester ? `${track.requester}` : (member?.user?.username ? `${member.user.username}` : (author ? `${author.username}` : "User"));
  
  // Generate beautiful visual card with timeout
  try {
    const cardBuffer = await Promise.race([
      MusicPlayerCard.generateNowPlayingCard(track, player, requester),
      new Promise((resolve) => setTimeout(() => resolve(null), 7000))
    ]);
    
    if (cardBuffer) {
      const attachment = new AttachmentBuilder(cardBuffer, { name: 'now-playing.png' });
      
      // Create control buttons
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('music_queue_view')
          .setLabel('Queue')
          .setEmoji('📋')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('music_previous')
          .setEmoji('⏮️')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(player.paused ? 'music_resume' : 'music_pause')
          .setEmoji(player.paused ? '▶️' : '⏸️')
          .setStyle(player.paused ? ButtonStyle.Success : ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('music_next')
          .setEmoji('⏭️')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('music_stop')
          .setEmoji('⏹️')
          .setStyle(ButtonStyle.Danger)
      );
      
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('music_shuffle')
          .setEmoji('🔀')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('music_loop')
          .setEmoji('🔁')
          .setStyle((player.queue.loop || 0) > 0 ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('music_voldown')
          .setLabel('Vol -')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('music_volup')
          .setLabel('Vol +')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('music_history')
          .setEmoji('🕐')
          .setStyle(ButtonStyle.Secondary)
      );
      
      return {
        files: [attachment],
        components: [row1, row2]
      };
    }
  } catch (error) {
    console.error('Error generating np card:', error.message);
  }
  
  // Fallback to container view if card generation fails
  return MusicPlayerView.createNowPlayingDisplay(player, requester, { member, author }, null);
}
