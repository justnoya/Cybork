const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const { Cluster } = require("lavaclient");
const prettyMs = require("pretty-ms");
const { load, SpotifyItemType } = require("@lavaclient/spotify");
const MusicPlayerView = require("@helpers/MusicPlayerView");
const MusicPlayerCard = require("@helpers/MusicPlayerCard");
const { addToHistory } = require("@handlers/musicInteractionRouter");
const emojiManager = require("@helpers/EmojiManager");
require("@lavaclient/queue/register");

/**
 * @param {import("@structures/BotClient")} client
 */
module.exports = (client) => {
  if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
    try {
      load({
        client: {
          id: process.env.SPOTIFY_CLIENT_ID,
          secret: process.env.SPOTIFY_CLIENT_SECRET,
        },
        autoResolveYoutubeTracks: false,
        loaders: [SpotifyItemType.Album, SpotifyItemType.Artist, SpotifyItemType.Playlist, SpotifyItemType.Track],
      });
      console.log(`${emojiManager.getSuccess()} Spotify integration connected successfully`);
    } catch (error) {
      console.error(`${emojiManager.getError()} Spotify integration failed:`, error.message);
    }
  }

  const lavaclient = new Cluster({
    nodes: client.config.MUSIC.LAVALINK_NODES,
    sendGatewayPayload: (id, payload) => {
      const guild = client.guilds.cache.get(id);
      if (guild) guild.shard.send(payload);
    },
  });

  client.once("ready", () => {
    console.log(`📡 Initializing Lavalink with User ID: ${client.user.id}`);
    
    setTimeout(() => {
      lavaclient.connect(client.user.id);
    }, 3000);
  });

  client.ws.on("VOICE_SERVER_UPDATE", (data) => lavaclient.handleVoiceUpdate(data));
  client.ws.on("VOICE_STATE_UPDATE", (data) => lavaclient.handleVoiceUpdate(data));

  lavaclient.on("nodeConnect", (node) => {
    client.logger.log(`Lavalink node "${node.id}" connected`);
  });

  lavaclient.on("nodeDisconnect", (node, reason) => {
    client.logger.warn(`${emojiManager.warning} Lavalink node "${node.id}" disconnected`);
  });

  lavaclient.on("nodeError", (node, error) => {
    client.logger.error(`${emojiManager.getError()} Lavalink node "${node.id}" error: ${error.message}`);
  });

  lavaclient.on("trackStart", async (player, track) => {
    const queue = player.queue;
    const channel = player.queue.data.channel || client.channels.cache.get(player.channelId);
    if (!channel) {
      client.logger.error(`❌ Channel not found for player in guild ${player.guildId}`);
      return;
    }

    const trackInfo = track.info || track;
    const requester = track.requester || 'Unknown User';

    client.logger.log(`${emojiManager.music} Track started: ${trackInfo.title} in guild ${player.guildId}`);
    
    // Skip sending card if play command already showed it
    if (player.queue.data.cardShownByPlayCommand) {
      client.logger.log(`⏭️ Skipping trackStart card - already shown by play command`);
      delete player.queue.data.cardShownByPlayCommand;
      return;
    }

    try {
      // Generate beautiful visual card with timeout for speed (7 seconds - increased for reliability)
      client.logger.log(`🎨 Generating music card for: ${trackInfo.title}`);
      const cardBuffer = await Promise.race([
        MusicPlayerCard.generateNowPlayingCard(track, player, requester),
        new Promise((resolve) => setTimeout(() => {
          client.logger.warn(`⏱️ Card generation timeout for: ${trackInfo.title}`);
          resolve(null);
        }, 7000))
      ]);
      
      if (cardBuffer) {
        client.logger.log(`✅ Generated music card successfully for: ${trackInfo.title}`);
        const attachment = new AttachmentBuilder(cardBuffer, { name: 'now-playing.png' });
        
        // Create control buttons
        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('music_queue_view')
            .setLabel('Queue')
            .setEmoji(emojiManager.queue)
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('music_previous')
            .setEmoji(emojiManager.previous)
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(player.paused ? 'music_resume' : 'music_pause')
            .setEmoji(player.paused ? emojiManager.play : emojiManager.pause)
            .setStyle(player.paused ? ButtonStyle.Success : ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('music_next')
            .setEmoji(emojiManager.skip)
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('music_stop')
            .setEmoji(emojiManager.stop)
            .setStyle(ButtonStyle.Danger)
        );
        
        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('music_shuffle')
            .setEmoji(emojiManager.shuffle)
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('music_loop')
            .setEmoji(emojiManager.repeat)
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
            .setEmoji(emojiManager.clock)
            .setStyle(ButtonStyle.Secondary)
        );
        
        // Send the music card
        client.logger.log(`📤 Sending music card message`);
        await channel.send({ 
          files: [attachment],
          components: [row1, row2]
        });
        client.logger.log(`✅ Sent music card successfully`);
      } else {
        // Fallback to container view
        client.logger.warn(`⚠️ Card generation timed out or failed for: ${trackInfo.title}, using fallback display`);
        const display = MusicPlayerView.createNowPlayingDisplay(player, requester, null, null);
        await channel.send(display);
      }
    } catch (error) {
      client.logger.error("Failed to send now playing message:", error);
      try {
        const title = trackInfo.title || track.title || 'Unknown Track';
        const author = trackInfo.author || track.author || 'Unknown Artist';
        await channel.send(`${emojiManager.music} Now Playing: **${title}** by ${author}`);
      } catch (err) {
        console.error("Could not send any message to channel:", err.message);
      }
    }
  });

  lavaclient.on("trackStuck", async (player, track, thresholdMs) => {
    client.logger.error(`${emojiManager.warning} Track stuck: ${track.info?.title || track.title} (${thresholdMs}ms)`);
    const channel = client.channels.cache.get(player.channelId);
    if (channel) {
      await channel.send(`${emojiManager.warning} Track got stuck, skipping to the next one...`).catch(() => {});
    }
    await player.queue.next();
  });

  lavaclient.on("trackException", async (player, track, exception) => {
    client.logger.error(`❌ Track exception: ${track.info?.title || track.title}`);
    client.logger.error(`Exception details: ${exception.message || JSON.stringify(exception)}`);
    const channel = client.channels.cache.get(player.channelId);
    if (channel) {
      await channel.send(`❌ Error playing track: ${exception.message || 'Unknown error'}. Skipping...`).catch(() => {});
    }
    await player.queue.next();
  });

  lavaclient.on("queueFinish", async (player) => {
    const channel = client.channels.cache.get(player.channelId);
    if (channel) {
      if (player.queue.current) {
        addToHistory(player.guildId, player.queue.current);
      }
      
      const display = MusicPlayerView.createEmptyQueueDisplay();
      await channel.send(display);
    }
    await player.disconnect();
  });

  return lavaclient;
};
