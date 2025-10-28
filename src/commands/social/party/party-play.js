const { ApplicationCommandOptionType } = require("discord.js");
const prettyMs = require("pretty-ms");
const { MUSIC } = require("@root/config");
const { SpotifyItemType } = require("@lavaclient/spotify");
const MusicPlayerView = require("@helpers/MusicPlayerView");
const ContainerBuilder = require("@helpers/ContainerBuilder");
const { createAudioResource } = require("@discordjs/voice");

const search_prefix = {
  YT: "ytsearch",
  YTM: "ytmsearch",
  SC: "scsearch",
};

module.exports = {
  name: "party-play",
  description: "Play a song in your listening party (synchronized for all members)",
  category: "MUSIC",
  botPermissions: ["EmbedLinks", "Connect", "Speak"],
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
    const response = await playInParty(message, query);
    if (response) await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const query = interaction.options.getString("query");
    const response = await playInParty(interaction, query);
    if (response) await interaction.followUp(response);
  },
};

async function playInParty({ member, guild, channel }, query) {
  if (!member.voice.channel) return "🚫 You need to join a voice channel first";

  const client = guild.client;

  const activeParties = await client.partyManager.getActivePartiesByGuild(guild.id);
  const party = activeParties.find((p) => p.members.some((m) => m.userId === member.id));

  if (!party) {
    return "🚫 You're not in any listening party! Create one with `/party-create` or join with `/party-join <party-id>`";
  }

  const isHost = party.hostId === member.id;
  if (!isHost && !party.settings.allowGuestControl) {
    return "🚫 Only the party host can control playback! The host can enable guest control in party settings.";
  }

  let tracks;
  let description = "";

  try {
    if (client.musicManager.spotify.isSpotifyUrl(query)) {
      if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
        return "🚫 Spotify songs cannot be played. Please contact the bot owner";
      }

      const item = await client.musicManager.spotify.load(query);
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
    } else {
      const node = client.musicManager.nodes.values().next().value;
      if (!node || !node.rest) {
        return "🚫 Music system is not available. Please try again later.";
      }

      const res = await node.rest.loadTracks(
        /^https?:\/\//.test(query) ? query : `${search_prefix[MUSIC.DEFAULT_SOURCE]}:${query}`
      );

      switch (res.loadType) {
        case "LOAD_FAILED":
          client.logger.error("Search Exception", res.exception);
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
          client.logger.error("Unknown loadType", res);
          return "🚫 An error occurred while searching for the song";
      }
    }
  } catch (error) {
    client.logger.error("Party Play Search Exception", error);
    return "🚫 An error occurred while searching for the song";
  }

  if (!tracks || tracks.length === 0) return "🚫 No tracks found!";

  for (const track of tracks) {
    await client.partyManager.addToQueue(party.partyId, track, member.user.username);
  }

  party.textChannelId = channel.id;
  await party.save();
  
  const player = client.partyManager.getPlayer(party.partyId);
  const isPlaying = player && player.state.status === 'playing';
  
  if (!isPlaying) {
    const updatedParty = await client.partyManager.getParty(party.partyId);
    await client.partyMusicHandler.startPlayback(updatedParty);
  }

  if (tracks.length === 1) {
    const track = tracks[0];
    const queueLength = party.queue.length;

    const components = [];

    components.push(
      ContainerBuilder.createTextDisplay(`# ${MusicPlayerView.EMOJIS.MUSIC} Added to Party Queue`)
    );

    const trackInfo = track.info || track;
    const titleMarkdown = trackInfo.uri ? `[${trackInfo.title}](${trackInfo.uri})` : `**${trackInfo.title}**`;

    components.push(
      ContainerBuilder.createTextDisplay(
        `### ${MusicPlayerView.EMOJIS.CHECK} ${titleMarkdown}\n` + `**Artist:** ${trackInfo.author}`
      )
    );

    components.push(ContainerBuilder.createSeparator());

    components.push(
      ContainerBuilder.createTextDisplay(
        `**Duration:** ${prettyMs(trackInfo.length || 0, { colonNotation: true })}\n` +
          `**Requested by:** @${member.user.username}\n` +
          `**Queue Position:** ${queueLength}`
      )
    );

    components.push(ContainerBuilder.createSeparator());

    components.push(
      ContainerBuilder.createTextDisplay(
        `**🎉 All ${party.members.length} party members** will hear this song synchronized!\n` +
          `**🗳️ Vote to skip:** \`/party-skip\``
      )
    );

    const container = new ContainerBuilder().addContainer({ accentColor: 0x8B5CF6, components }).build();

    return container;
  } else {
    const components = [];

    components.push(ContainerBuilder.createTextDisplay(`# ${MusicPlayerView.EMOJIS.QUEUE} Playlist Added to Party`));

    components.push(ContainerBuilder.createTextDisplay(`### ${MusicPlayerView.EMOJIS.CHECK} Added **${description}** to the queue.`));

    components.push(ContainerBuilder.createSeparator());

    const totalDuration = prettyMs(
      tracks.map((t) => t.info.length).reduce((a, b) => a + b, 0),
      { colonNotation: true }
    );

    components.push(
      ContainerBuilder.createTextDisplay(
        `**Tracks:** ${tracks.length} songs • **Duration:** ${totalDuration}\n` +
          `**Requested by:** @${member.user.username}\n` +
          `**Party Members:** ${party.members.length} (all will hear this!)`
      )
    );

    const container = new ContainerBuilder().addContainer({ accentColor: 0x8B5CF6, components }).build();

    return container;
  }
}
