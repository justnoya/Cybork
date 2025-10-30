const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const { Riffy } = require("riffy");
const prettyMs = require("pretty-ms");
const MusicPlayerView = require("@helpers/MusicPlayerView");
const MusicPlayerCard = require("@helpers/MusicPlayerCard");
const { addToHistory } = require("@handlers/musicInteractionRouter");
const emojiManager = require("@helpers/EmojiManager");

/**
 * Enhanced Lavalink music system using Riffy
 * Powerful, stable, and supports all audio effects (8D, bassboost, nightcore, etc.)
 * @param {import("@structures/BotClient")} client
 */
module.exports = (client) => {
  client.logger.log("🎵 Initializing Riffy Lavalink music system...");

  // Configure Lavalink nodes from config
  const nodes = client.config.MUSIC.LAVALINK_NODES.map(node => ({
    host: node.host,
    port: node.port,
    password: node.password,
    secure: node.secure || false,
    name: node.id || `${node.host}:${node.port}`
  }));

  client.logger.log(`📡 Configuring ${nodes.length} Lavalink node(s):`);
  nodes.forEach(node => {
    client.logger.log(`  - ${node.name} (${node.secure ? 'https' : 'http'}://${node.host}:${node.port})`);
  });

  // Initialize Riffy with enhanced configuration
  const riffy = new Riffy(client, nodes, {
    send: (payload) => {
      const guild = client.guilds.cache.get(payload.d.guild_id);
      if (guild) guild.shard.send(payload);
    },
    defaultSearchPlatform: client.config.MUSIC.DEFAULT_SOURCE === 'YT' ? 'ytsearch' : 
                          client.config.MUSIC.DEFAULT_SOURCE === 'YTM' ? 'ytmsearch' : 
                          'scsearch',
    restVersion: 'v3',
    reconnectInterval: 5000,
    reconnectTries: 10
  });

  // Initialize Riffy when client is ready
  client.once("ready", () => {
    client.logger.log(`📡 Initializing Riffy with User ID: ${client.user.id}`);
    
    setTimeout(() => {
      riffy.init(client.user.id);
    }, 3000);
  });

  // Node connection events
  riffy.on("nodeConnect", (node) => {
    client.logger.log(`${emojiManager.getSuccess()} Lavalink node "${node.name}" connected successfully`);
  });

  riffy.on("nodeDisconnect", (node, reason) => {
    client.logger.warn(`${emojiManager.warning} Lavalink node "${node.name}" disconnected: ${reason || 'Unknown reason'}`);
  });

  riffy.on("nodeError", (node, error) => {
    client.logger.error(`${emojiManager.getError()} Lavalink node "${node.name}" error: ${error.message}`);
  });

  riffy.on("nodeReconnect", (node) => {
    client.logger.log(`🔄 Lavalink node "${node.name}" reconnecting...`);
  });

  // Track start event
  riffy.on("trackStart", async (player, track) => {
    const channel = client.channels.cache.get(player.textChannel);
    if (!channel) {
      client.logger.error(`❌ Channel not found for player in guild ${player.guildId}`);
      return;
    }

    const trackInfo = track.info || track;
    const requester = track.requester?.username || track.requester || 'Unknown User';

    client.logger.log(`${emojiManager.music} Track started: ${trackInfo.title} in guild ${player.guildId}`);
    
    // Skip sending card if play command already showed it
    if (player.data?.cardShownByPlayCommand) {
      client.logger.log(`⏭️ Skipping trackStart card - already shown by play command`);
      delete player.data.cardShownByPlayCommand;
      return;
    }

    try {
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
            .setStyle(player.loop !== 'none' ? ButtonStyle.Success : ButtonStyle.Secondary),
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
        
        client.logger.log(`📤 Sending music card message`);
        await channel.send({ 
          files: [attachment],
          components: [row1, row2]
        });
        client.logger.log(`✅ Sent music card successfully`);
      } else {
        client.logger.warn(`⚠️ Card generation timed out, using fallback display`);
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
        client.logger.error("Could not send any message to channel:", err.message);
      }
    }
  });

  // Track end event
  riffy.on("trackEnd", async (player, track, reason) => {
    if (reason === "finished" || reason === "FINISHED") {
      if (track) {
        addToHistory(player.guildId, track);
      }
      client.logger.log(`✅ Track finished: ${track.info?.title || track.title}`);
    }
  });

  // Queue end event
  riffy.on("queueEnd", async (player) => {
    const channel = client.channels.cache.get(player.textChannel);
    if (channel) {
      if (player.current) {
        addToHistory(player.guildId, player.current);
      }
      
      const display = MusicPlayerView.createEmptyQueueDisplay();
      await channel.send(display);
    }
    
    client.logger.log(`📭 Queue finished in guild ${player.guildId}`);
    
    // Disconnect after idle time
    setTimeout(() => {
      if (!player.playing && !player.paused) {
        player.disconnect();
      }
    }, client.config.MUSIC.IDLE_TIME * 1000);
  });

  // Player disconnect event
  riffy.on("playerDisconnect", async (player) => {
    client.logger.log(`🔌 Player disconnected in guild ${player.guildId}`);
  });

  // Track stuck event - improved error handling
  riffy.on("trackStuck", async (player, track, thresholdMs) => {
    client.logger.error(`${emojiManager.warning} Track stuck: ${track.info?.title || track.title} (${thresholdMs}ms)`);
    const channel = client.channels.cache.get(player.textChannel);
    
    try {
      if (player.current) {
        addToHistory(player.guildId, player.current);
      }
      
      if (channel) {
        await channel.send(`${emojiManager.warning} Track got stuck, skipping to the next one...`).catch(() => {});
      }
      
      if (player.queue && player.queue.length > 0) {
        await player.skip();
      } else {
        await player.stop();
        if (channel) {
          const display = MusicPlayerView.createEmptyQueueDisplay();
          await channel.send(display).catch(() => {});
        }
      }
    } catch (error) {
      client.logger.error('Error handling trackStuck:', error.message);
      try {
        await player.stop();
      } catch (e) {
        client.logger.error('Failed to stop player after trackStuck error:', e.message);
      }
    }
  });

  // Track error event - improved error handling
  riffy.on("trackError", async (player, track, error) => {
    client.logger.error(`❌ Track error: ${track.info?.title || track.title}`);
    client.logger.error(`Error details: ${error.message || JSON.stringify(error)}`);
    const channel = client.channels.cache.get(player.textChannel);
    
    try {
      if (player.current) {
        addToHistory(player.guildId, player.current);
      }
      
      if (channel) {
        await channel.send(`❌ Error playing track: ${error.message || 'Unknown error'}. Skipping...`).catch(() => {});
      }
      
      if (player.queue && player.queue.length > 0) {
        await player.skip();
      } else {
        await player.stop();
        if (channel) {
          const display = MusicPlayerView.createEmptyQueueDisplay();
          await channel.send(display).catch(() => {});
        }
      }
    } catch (error) {
      client.logger.error('Error handling trackError:', error.message);
      try {
        await player.stop();
      } catch (e) {
        client.logger.error('Failed to stop player after trackError error:', e.message);
      }
    }
  });

  // Player create event
  riffy.on("playerCreate", (player) => {
    client.logger.log(`🎵 Player created for guild ${player.guildId}`);
    player.data = player.data || {};
  });

  // Player destroy event
  riffy.on("playerDestroy", (player) => {
    client.logger.log(`💥 Player destroyed for guild ${player.guildId}`);
  });

  // Add compatibility methods
  riffy.getPlayer = (guildId) => {
    return riffy.players.get(guildId);
  };

  riffy.destroyPlayer = async (guildId) => {
    const player = riffy.players.get(guildId);
    if (player) {
      await player.destroy();
    }
  };

  // Spotify integration
  if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
    client.logger.log(`${emojiManager.getSuccess()} Spotify credentials found - Lavalink will handle Spotify tracks`);
  }

  client.logger.log(`${emojiManager.getSuccess()} Riffy Lavalink music system initialized!`);
  client.logger.log("🎵 Supports: YouTube, Spotify, SoundCloud, and more!");
  client.logger.log("🎛️  Effects ready: 8D, bassboost, nightcore, tremolo, karaoke, and all Lavalink filters");

  return riffy;
};
