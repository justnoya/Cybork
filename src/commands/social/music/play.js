const { EmbedBuilder, ApplicationCommandOptionType, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const prettyMs = require("pretty-ms");
const { EMBED_COLORS, MUSIC } = require("@root/config");
const MusicPlayerView = require("@helpers/MusicPlayerView");
const MusicPlayerCard = require("@helpers/MusicPlayerCard");
const ContainerBuilder = require("@helpers/ContainerBuilder");

const search_prefix = {
  YT: "ytsearch",
  YTM: "ytmsearch",
  SC: "scsearch",
};

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "play",
  description: "play a song from youtube",
  category: "MUSIC",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    usage: "<song-name>",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "query",
        description: "song name or url",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  async messageRun(message, args) {
    const query = args.join(" ");
    const response = await play(message, query);
    if (response) await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const query = interaction.options.getString("query");
    const response = await play(interaction, query);
    if (response) await interaction.followUp(response);
  },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 * @param {string} query
 */
async function play({ member, guild, channel }, query) {
  if (!member.voice.channel) return "🚫 You need to join a voice channel first";

  let player = guild.client.musicManager.getPlayer(guild.id);
  if (player && !guild.members.me.voice.channel) {
    await player.disconnect();
    await guild.client.musicManager.destroyPlayer(guild.id);
    player = null;
  }

  if (player && member.voice.channel.id !== guild.members.me.voice.channel?.id) {
    return "🚫 You must be in the same voice channel as mine";
  }

  let tracks = [];
  let description = "";

  try {
    // Use Riffy's resolve method to handle all platforms including Spotify
    const resolve = await guild.client.musicManager.resolve({
      query: /^https?:\/\//.test(query) ? query : `${search_prefix[MUSIC.DEFAULT_SOURCE]}:${query}`,
      requester: member.user
    });

    const { loadType, tracks: resolvedTracks, playlistInfo } = resolve;

    // Handle Lavalink v4 load types
    if (loadType === "error" || loadType === "empty") {
      guild.client.logger.error("Search error", resolve);
      return "🚫 There was an error while searching";
    }

    if (loadType === "playlist") {
      tracks = resolvedTracks;
      description = playlistInfo?.name || "Playlist";
    } else if (loadType === "search" || loadType === "track") {
      if (!resolvedTracks || resolvedTracks.length === 0) {
        return `No results found matching ${query}`;
      }
      tracks = [resolvedTracks[0]];
    } else {
      return `No results found matching ${query}`;
    }

    if (!tracks || tracks.length === 0) {
      guild.client.logger.debug({ query, resolve });
      return "🚫 An error occurred while searching for the song";
    }
  } catch (error) {
    guild.client.logger.error("Search Exception", typeof error === "object" ? JSON.stringify(error) : error);
    return "🚫 An error occurred while searching for the song";
  }

  // Create player and/or join the member's VC
  if (!player || !player.connected) {
    player = guild.client.musicManager.createConnection({
      guildId: guild.id,
      voiceChannel: member.voice.channel.id,
      textChannel: channel.id,
      deaf: true
    });
    
    // Initialize player data
    player.data = player.data || {};
    
    // Wait for connection to be ready (prevents "playing but no sound" issue)
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        guild.client.logger.warn('Voice connection took longer than expected, proceeding anyway');
        resolve();
      }, 5000);
      
      const checkConnection = setInterval(() => {
        if (player.connected && guild.members.me.voice.channel) {
          clearInterval(checkConnection);
          clearTimeout(timeout);
          resolve();
        }
      }, 100);
    });
    
    // Additional brief wait for Lavalink voice session to stabilize
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Check if player is already playing
  const wasPlaying = player.playing || player.paused;
  const wasEmpty = !player.queue || player.queue.length === 0;

  // Add tracks to queue
  for (const track of tracks) {
    player.queue.add(track);
  }
  
  // Start playback if not already started
  if (!wasPlaying) {
    await player.play();
    
    // For single tracks, show visual now playing card immediately
    if (tracks.length === 1) {
      // Wait briefly for track to start
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const track = tracks[0];
      
      try {
        // Generate beautiful visual card
        const cardBuffer = await Promise.race([
          MusicPlayerCard.generateNowPlayingCard(track, player, member.user.username),
          new Promise((resolve) => setTimeout(() => resolve(null), 7000))
        ]);
        
        if (cardBuffer) {
          const attachment = new AttachmentBuilder(cardBuffer, { name: 'now-playing.png' });
          
          // Use new container display with card inside
          const containerDisplay = MusicPlayerView.createNowPlayingWithCard(player, member.user.username, cardBuffer);
          
          // Mark that we've already shown the card so trackStart won't send another
          player.data.cardShownByPlayCommand = true;
          
          return {
            files: [attachment],
            ...containerDisplay
          };
        }
      } catch (error) {
        guild.client.logger.error('Error generating play card:', error.message);
      }
      
      // Fallback to enqueued card if visual card fails
      return MusicPlayerView.createEnqueuedCard(track, member.user.username, null, 0);
    }
  }

  // Show professional enqueued card for tracks added to existing queue
  if (tracks.length === 1) {
    const track = tracks[0];
    const position = player.queue.length > 0 ? player.queue.length : null;
    const queueLength = player.queue.length || 0;
    
    return MusicPlayerView.createEnqueuedCard(track, member.user.username, position, queueLength);
  } else {
    // For playlists, show professional playlist added card
    const components = [];
    
    components.push(ContainerBuilder.createTextDisplay(
      `# ${MusicPlayerView.EMOJIS.QUEUE} Playlist Enqueued`
    ));
    
    components.push(ContainerBuilder.createTextDisplay(
      `### ${MusicPlayerView.EMOJIS.CHECK} Added **${description}** to the queue.`
    ));
    
    components.push(ContainerBuilder.createSeparator());
    
    const totalDuration = prettyMs(
      tracks.map((t) => t.info.length).reduce((a, b) => a + b, 0),
      { colonNotation: true }
    );
    
    components.push(ContainerBuilder.createTextDisplay(
      `**Tracks:** ${tracks.length} songs • **Duration:** ${totalDuration}\n` +
      `**Requested by:** @${member.user.username}`
    ));
    
    const container = new ContainerBuilder()
      .addContainer({ accentColor: MusicPlayerView.THEME.PURPLE, components })
      .build();
    
    return container;
  }
}
