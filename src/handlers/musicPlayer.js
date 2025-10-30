const { Player, SearchResult } = require("discord-player");
const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const MusicPlayerCard = require("@helpers/MusicPlayerCard");
const MusicPlayerView = require("@helpers/MusicPlayerView");
const emojiManager = require("@helpers/EmojiManager");
const { addToHistory } = require("@handlers/musicInteractionRouter");

/**
 * High-performance music player system built for handling 50-100+ concurrent servers
 * Uses discord-player for optimal performance and audio quality
 * @param {import("@structures/BotClient")} client
 */
module.exports = (client) => {
  client.logger.log("🎵 Initializing high-performance music player system...");

  const player = new Player(client, {
    skipFFmpeg: false,
    ytdlOptions: {
      quality: "highestaudio",
      highWaterMark: 1 << 25,
      filter: "audioonly",
      requestOptions: {
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      },
    },
    connectionTimeout: 30_000,
    queryCache: new Map(),
    lagMonitor: 10000,
    leaveOnEnd: true,
    leaveOnStop: true,
    leaveOnEmpty: true,
    leaveOnEmptyCooldown: client.config.MUSIC.IDLE_TIME * 1000 || 60000,
    selfDeaf: true,
    enableLive: true,
  });

  client.player = player;

  (async () => {
    try {
      const { DefaultExtractors } = await import("@discord-player/extractor");
      await player.extractors.loadMulti(DefaultExtractors);
      client.logger.log("✅ Music extractors loaded successfully (YouTube, Spotify, SoundCloud, Apple Music, etc.)");
    } catch (error) {
      client.logger.error("❌ Failed to load music extractors:", error.message);
    }
  })();

  player.events.on("connection", (queue) => {
    client.logger.log(`🔌 Connected to voice channel in guild: ${queue.guild.name}`);
    queue.metadata.cardShownByPlayCommand = false;
  });

  player.events.on("disconnect", (queue) => {
    client.logger.log(`🔌 Disconnected from voice channel in guild: ${queue.guild.name}`);
  });

  player.events.on("error", (queue, error) => {
    client.logger.error(`❌ Player error in ${queue.guild.name}:`, error.message);
    const channel = queue.metadata?.channel;
    if (channel) {
      channel.send(`${emojiManager.getError()} An error occurred: ${error.message}`).catch(() => {});
    }
  });

  player.events.on("playerError", (queue, error) => {
    client.logger.error(`❌ Player error in ${queue.guild.name}:`, error.message);
    const channel = queue.metadata?.channel;
    if (channel) {
      channel.send(`${emojiManager.getError()} Playback error: ${error.message}`).catch(() => {});
    }
  });

  player.events.on("playerStart", async (queue, track) => {
    const channel = queue.metadata?.channel;
    if (!channel) {
      client.logger.error(`❌ Channel not found for queue in guild ${queue.guild.id}`);
      return;
    }

    const requester = track.requestedBy?.username || track.requestedBy?.tag || "Unknown User";
    client.logger.log(`${emojiManager.music} Now playing: ${track.title} in ${queue.guild.name}`);

    if (queue.metadata?.cardShownByPlayCommand) {
      client.logger.log(`⏭️ Skipping playerStart card - already shown by play command`);
      queue.metadata.cardShownByPlayCommand = false;
      return;
    }

    try {
      client.logger.log(`🎨 Generating music card for: ${track.title}`);
      const cardBuffer = await Promise.race([
        MusicPlayerCard.generateNowPlayingCardV2(track, queue, requester),
        new Promise((resolve) =>
          setTimeout(() => {
            client.logger.warn(`⏱️ Card generation timeout for: ${track.title}`);
            resolve(null);
          }, 7000)
        ),
      ]);

      if (cardBuffer) {
        client.logger.log(`✅ Music card generated successfully for: ${track.title}`);
        const attachment = new AttachmentBuilder(cardBuffer, { name: "now-playing.png" });

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("music_queue_view")
            .setLabel("Queue")
            .setEmoji(emojiManager.queue)
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("music_previous")
            .setEmoji(emojiManager.previous)
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(queue.node.isPaused() ? "music_resume" : "music_pause")
            .setEmoji(queue.node.isPaused() ? emojiManager.play : emojiManager.pause)
            .setStyle(queue.node.isPaused() ? ButtonStyle.Success : ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("music_next")
            .setEmoji(emojiManager.skip)
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("music_stop")
            .setEmoji(emojiManager.stop)
            .setStyle(ButtonStyle.Danger)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("music_shuffle")
            .setEmoji(emojiManager.shuffle)
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("music_loop")
            .setEmoji(emojiManager.repeat)
            .setStyle(queue.repeatMode !== 0 ? ButtonStyle.Success : ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("music_voldown")
            .setLabel("Vol -")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("music_volup")
            .setLabel("Vol +")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("music_history")
            .setEmoji(emojiManager.clock)
            .setStyle(ButtonStyle.Secondary)
        );

        client.logger.log(`📤 Sending music card message`);
        await channel.send({
          files: [attachment],
          components: [row1, row2],
        });
        client.logger.log(`✅ Music card sent successfully`);
      } else {
        client.logger.warn(`⚠️ Card generation timed out for: ${track.title}, using fallback`);
        const display = MusicPlayerView.createNowPlayingDisplayV2(queue, requester);
        await channel.send(display);
      }
    } catch (error) {
      client.logger.error("Failed to send now playing message:", error);
      try {
        await channel.send(`${emojiManager.music} Now Playing: **${track.title}** by ${track.author}`);
      } catch (err) {
        client.logger.error("Could not send any message to channel:", err.message);
      }
    }
  });

  player.events.on("playerFinish", async (queue, track) => {
    if (track) {
      addToHistory(queue.guild.id, track);
      client.logger.log(`✅ Track finished: ${track.title}`);
    }
  });

  player.events.on("emptyQueue", async (queue) => {
    const channel = queue.metadata?.channel;
    if (channel) {
      if (queue.currentTrack) {
        addToHistory(queue.guild.id, queue.currentTrack);
      }

      const display = MusicPlayerView.createEmptyQueueDisplay();
      await channel.send(display).catch(() => {});
    }
    client.logger.log(`📭 Queue finished in ${queue.guild.name}`);
  });

  player.events.on("emptyChannel", async (queue) => {
    const channel = queue.metadata?.channel;
    if (channel) {
      await channel
        .send(`${emojiManager.getError()} Nobody is in the voice channel, leaving...`)
        .catch(() => {});
    }
    client.logger.log(`👋 Left empty voice channel in ${queue.guild.name}`);
  });

  player.events.on("playerSkip", (queue, track) => {
    client.logger.log(`⏭️ Skipped: ${track.title} in ${queue.guild.name}`);
  });

  player.events.on("audioTrackAdd", (queue, track) => {
    client.logger.log(`➕ Added to queue: ${track.title} in ${queue.guild.name}`);
  });

  player.events.on("audioTracksAdd", (queue, tracks) => {
    client.logger.log(`➕ Added ${tracks.length} tracks to queue in ${queue.guild.name}`);
  });

  player.events.on("debug", (queue, message) => {
    if (message.includes("error") || message.includes("fail")) {
      client.logger.warn(`🐛 [DEBUG] ${queue.guild.name}: ${message}`);
    }
  });

  client.logger.log(`${emojiManager.getSuccess()} High-performance music player initialized and ready!`);
  client.logger.log("🎵 Supports: YouTube, Spotify, SoundCloud, Apple Music, and more!");
  client.logger.log("⚡ Optimized for 50-100+ concurrent servers with crystal-clear audio");

  return player;
};
