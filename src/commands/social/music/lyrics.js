const { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { musicValidations } = require("@helpers/BotUtils");
const MusicPlayerView = require("@helpers/MusicPlayerView");
const ContainerBuilder = require("@helpers/ContainerBuilder");
const axios = require("axios");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "lyrics",
  description: "display lyrics for current song or search query",
  category: "MUSIC",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    usage: "[song name]",
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "query",
        type: ApplicationCommandOptionType.String,
        description: "song name to search (leave empty for current song)",
        required: false,
      },
    ],
  },

  async messageRun(message, args) {
    const query = args.join(" ");
    const response = await getLyrics(message, query);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const query = interaction.options.getString("query");
    const response = await getLyrics(interaction, query);
    await interaction.followUp(response);
  },
};

async function getLyrics({ client, guildId, member, author }, query) {
  let searchQuery = query;
  let trackArtist = "";
  let trackTitle = "";
  
  // If no query provided, try to get current playing song
  if (!searchQuery) {
    const player = client.musicManager.getPlayer(guildId);
    if (!player || !player.queue.current) {
      return "❌ No song is currently playing. Please provide a song name!";
    }
    const track = player.queue.current;
    const trackInfo = track.info || track;
    trackTitle = trackInfo.title || "";
    trackArtist = trackInfo.author || "";
    searchQuery = `${trackTitle} ${trackArtist}`;
  } else {
    // Try to split query into artist and title
    const parts = searchQuery.split('-').map(s => s.trim());
    if (parts.length >= 2) {
      trackTitle = parts[0];
      trackArtist = parts[1];
    } else {
      const words = searchQuery.split(' ');
      trackTitle = words.slice(0, Math.floor(words.length / 2)).join(' ');
      trackArtist = words.slice(Math.floor(words.length / 2)).join(' ');
    }
  }

  try {
    // Use LRCLIB API (free, no auth needed)
    const response = await axios.get('https://lrclib.net/api/search', {
      params: { q: searchQuery },
      timeout: 10000
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("No results from LRCLIB");
    }

    const song = response.data[0];
    const lyrics = song.plainLyrics || song.syncedLyrics || "";
    
    // Check if lyrics are actually present and not empty
    if (!lyrics || lyrics.trim().length === 0) {
      throw new Error("LRCLIB returned empty lyrics");
    }
    
    const title = song.trackName || song.name || "Unknown";
    const artist = song.artistName || song.artist || "Unknown Artist";
    const album = song.albumName || "";
    const duration = song.duration || 0;

    return createLyricsDisplay(title, artist, album, lyrics, duration, searchQuery);

  } catch (error) {
    client.logger.error("Lyrics fetch error:", error);
    
    // Fallback: Try alternate free API with proper artist/title
    if (trackArtist && trackTitle) {
      try {
        const encodedArtist = encodeURIComponent(trackArtist);
        const encodedTitle = encodeURIComponent(trackTitle);
        const fallbackResponse = await axios.get(`https://api.lyrics.ovh/v1/${encodedArtist}/${encodedTitle}`, {
          timeout: 10000
        });
        
        if (fallbackResponse.data && fallbackResponse.data.lyrics) {
          return createLyricsDisplay(
            trackTitle,
            trackArtist,
            "",
            fallbackResponse.data.lyrics,
            0,
            searchQuery
          );
        }
      } catch (fallbackError) {
        client.logger.error("Fallback API also failed:", fallbackError.message);
      }
    }

    return createNoLyricsFound(searchQuery);
  }
}

function createNoLyricsFound(query) {
  const components = [];
  
  components.push(ContainerBuilder.createTextDisplay(
    `# ❌ Lyrics Not Found\n\n` +
    `Couldn't find lyrics for **${query}**`
  ));

  components.push(ContainerBuilder.createSeparator());

  components.push(ContainerBuilder.createTextDisplay(
    `### 💡 Tips:\n` +
    `• Try searching with: **Song Title - Artist Name**\n` +
    `• Check your spelling\n` +
    `• Use the exact song title`
  ));

  return new ContainerBuilder()
    .addContainer({ accentColor: MusicPlayerView.THEME.RED, components })
    .build();
}

function createLyricsDisplay(title, artist, album, lyrics, duration, query) {
  const components = [];

  // Header with song info
  components.push(ContainerBuilder.createTextDisplay(
    `# 🎤 Song Lyrics`
  ));

  components.push(ContainerBuilder.createTextDisplay(
    `### **${title}**\n*${artist}*${album ? ` • ${album}` : ''}`
  ));

  components.push(ContainerBuilder.createSeparator());

  // Handle long lyrics (Discord has 4000 char limit per text display)
  const maxLength = 3500;
  
  if (lyrics.length > maxLength) {
    // Show first part with continuation notice
    const truncatedLyrics = lyrics.substring(0, maxLength);
    const lastNewline = truncatedLyrics.lastIndexOf('\n');
    const displayLyrics = lastNewline > 0 ? truncatedLyrics.substring(0, lastNewline) : truncatedLyrics;
    
    components.push(ContainerBuilder.createTextDisplay(
      displayLyrics + `\n\n*[Lyrics truncated due to length - showing first part]*`
    ));
  } else {
    components.push(ContainerBuilder.createTextDisplay(lyrics));
  }

  components.push(ContainerBuilder.createSeparator());

  const wordCount = lyrics.split(/\s+/).length;
  const lineCount = lyrics.split('\n').length;

  components.push(ContainerBuilder.createTextDisplay(
    `📊 **${wordCount}** words • **${lineCount}** lines${duration ? ` • ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')} duration` : ''}`
  ));

  return new ContainerBuilder()
    .addContainer({ accentColor: MusicPlayerView.THEME.CYAN, components })
    .build();
}
