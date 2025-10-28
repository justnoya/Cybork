const { EmbedBuilder, ApplicationCommandOptionType, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const prettyMs = require("pretty-ms");
const { EMBED_COLORS, MUSIC } = require("@root/config");
const { SpotifyItemType } = require("@lavaclient/spotify");
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
    player.disconnect();
    await guild.client.musicManager.destroyPlayer(guild.id);
    player = null;
  }

  if (player && member.voice.channel !== guild.members.me.voice.channel) {
    return "🚫 You must be in the same voice channel as mine";
  }

  let embed = new EmbedBuilder().setColor(EMBED_COLORS.BOT_EMBED);
  let tracks;
  let description = "";

  try {
    if (guild.client.musicManager.spotify.isSpotifyUrl(query)) {
      if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
        return "🚫 Spotify songs cannot be played. Please contact the bot owner";
      }

      const item = await guild.client.musicManager.spotify.load(query);
      switch (item?.type) {
        case SpotifyItemType.Track: {
          const track = await item.resolveYoutubeTrack();
          tracks = [track];
          description = `[${track.info.title}](${track.info.uri})`;
          break;
        }

        case SpotifyItemType.Artist:
          tracks = await item.resolveYoutubeTracks();
          description = `Artist: [**${item.name}**](${query})`;
          break;

        case SpotifyItemType.Album:
          tracks = await item.resolveYoutubeTracks();
          description = `Album: [**${item.name}**](${query})`;
          break;

        case SpotifyItemType.Playlist:
          tracks = await item.resolveYoutubeTracks();
          description = `Playlist: [**${item.name}**](${query})`;
          break;

        default:
          return "🚫 An error occurred while searching for the song";
      }

      if (!tracks) guild.client.logger.debug({ query, item });
    } else {
      // Get the first available node's REST API
      const node = guild.client.musicManager.nodes.values().next().value;
      if (!node || !node.rest) {
        return "🚫 Music system is not available. Please try again later.";
      }

      const res = await node.rest.loadTracks(
        /^https?:\/\//.test(query) ? query : `${search_prefix[MUSIC.DEFAULT_SOURCE]}:${query}`
      );
      switch (res.loadType) {
        case "LOAD_FAILED":
          guild.client.logger.error("Search Exception", res.exception);
          return "🚫 There was an error while searching";

        case "NO_MATCHES":
          return `No results found matching ${query}`;

        case "PLAYLIST_LOADED":
          tracks = res.tracks;
          description = res.playlistInfo.name;
          break;

        case "TRACK_LOADED":
        case "SEARCH_RESULT": {
          const [track] = res.tracks;
          tracks = [track];
          break;
        }

        default:
          guild.client.logger.debug("Unknown loadType", res);
          return "🚫 An error occurred while searching for the song";
      }

      if (!tracks) guild.client.logger.debug({ query, res });
    }
  } catch (error) {
    guild.client.logger.error("Search Exception", typeof error === "object" ? JSON.stringify(error) : error);
    return "🚫 An error occurred while searching for the song";
  }

  if (!tracks) return "🚫 An error occurred while searching for the song";

  // create a player and/or join the member's vc
  if (!player?.connected) {
    player = guild.client.musicManager.createPlayer(guild.id);
    player.queue.data.channel = channel;
    player.connect(member.voice.channel.id, { deafened: true });
    
    // Wait a moment for connection to establish properly
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // do queue things
  const started = player.playing || player.paused;
  const wasEmpty = !player?.queue.tracks.length;
  player.queue.add(tracks, { requester: member.user.username, next: false });
  
  // Start playback if not already started
  if (!started) {
    // For single tracks on empty queue, send loading message that will be edited with the card
    if (wasEmpty && tracks.length === 1) {
      const loadingMsg = await channel.send("🎧 **Vibing...** _Loading your music_");
      player.queue.data.loadingMessage = loadingMsg;
      
      await player.queue.start();
      
      // Return null to prevent duplicate messages
      return null;
    }
    
    // For playlists or other cases, just start normally
    await player.queue.start();
  }

  // Show professional enqueued card for single tracks
  if (tracks.length === 1) {
    const track = tracks[0];
    const position = player?.queue?.tracks?.length > 0 ? player.queue.tracks.length : null;
    const queueLength = player?.queue?.tracks?.length || 0;
    
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