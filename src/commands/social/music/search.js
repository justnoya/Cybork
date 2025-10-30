const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ApplicationCommandOptionType,
  ComponentType,
} = require("discord.js");
const prettyMs = require("pretty-ms");
const { EMBED_COLORS, MUSIC } = require("@root/config");
const ContainerBuilder = require("@helpers/ContainerBuilder");
const MusicPlayerView = require("@helpers/MusicPlayerView");

const search_prefix = {
  YT: "ytsearch",
  YTM: "ytmsearch",
  SC: "scsearch",
};

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "search",
  description: "search for matching songs on youtube",
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
        description: "song to search",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  async messageRun(message, args) {
    const query = args.join(" ");
    const response = await search(message, query);
    if (response) await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const query = interaction.options.getString("query");
    const response = await search(interaction, query);
    if (response) await interaction.followUp(response);
    else interaction.deleteReply();
  },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 * @param {string} query
 */
async function search({ member, guild, channel }, query) {
  if (!member.voice.channel) return "🚫 You need to join a voice channel first";

  let player = guild.client.musicManager.getPlayer(guild.id);
  if (player && !guild.members.me.voice.channel) {
    player.disconnect();
    await guild.client.musicManager.destroyPlayer(guild.id);
  }
  if (player && member.voice.channel !== guild.members.me.voice.channel) {
    return "🚫 You must be in the same voice channel as mine";
  }

  let res;
  try {
    // Get the first available node's REST API
    const node = guild.client.musicManager.nodes.values().next().value;
    if (!node || !node.rest) {
      return "🚫 Music system is not available. Please try again later.";
    }

    res = await node.rest.loadTracks(
      /^https?:\/\//.test(query) ? query : `${search_prefix[MUSIC.DEFAULT_SOURCE]}:${query}`
    );
  } catch (err) {
    guild.client.logger.error("Music search error:", err);
    return "🚫 There was an error while searching";
  }

  let embed = new EmbedBuilder().setColor(EMBED_COLORS.BOT_EMBED);
  let tracks;

  const loadType = res.tracks.length > 0 ? res.loadType : "NO_MATCHES";
  switch (loadType) {
    case "LOAD_FAILED":
      guild.client.logger.error("Search Exception", res.exception);
      return "🚫 There was an error while searching";

    case "NO_MATCHES":
      return `No results found matching ${query}`;

    case "TRACK_LOADED": {
      const [track] = res.tracks;
      tracks = [track];
      
      // Use container UI for track loaded
      const position = player?.queue?.tracks?.length > 0 ? player.queue.tracks.length + 1 : null;
      const queueLength = player?.queue?.tracks?.length || 0;
      
      // Early return with container display before starting player
      if (!player?.playing && !player?.paused && !player?.queue.tracks.length) {
        // Will return container after player starts below
        break;
      }
      
      const trackDuration = prettyMs(track.info.length, { colonNotation: true });
      const components = [];
      
      const thumbnail = MusicPlayerView.getThumbnailUrl(track);
      if (thumbnail) {
        components.push(ContainerBuilder.createThumbnail(thumbnail));
      }
      
      components.push(ContainerBuilder.createTextDisplay(
        `# 🎵 Added to Queue`
      ));
      
      const titleLink = track.info.uri 
        ? `[${track.info.title}](${track.info.uri})` 
        : `**${track.info.title}**`;
      
      components.push(ContainerBuilder.createTextDisplay(
        `### ${titleLink}\n*${track.info.author || 'Unknown Artist'}*`
      ));
      
      components.push(ContainerBuilder.createSeparator());
      
      const infoText = [
        `**Duration:** \`${trackDuration}\``,
        position ? `**Position:** ${position}/${queueLength + 1}` : null,
        `**Requested by:** @${member.user.username}`
      ].filter(Boolean).join(' • ');
      
      components.push(ContainerBuilder.createTextDisplay(infoText));
      
      const container = new ContainerBuilder()
        .addContainer({ accentColor: 0xA855F7, components })
        .build();
      
      embed = container;
      break;
    }

    case "PLAYLIST_LOADED":
      tracks = res.tracks;
      
      const totalDuration = prettyMs(
        res.tracks.map((t) => t.info.length).reduce((a, b) => a + b, 0),
        { colonNotation: true }
      );
      
      const components = [];
      
      components.push(ContainerBuilder.createTextDisplay(
        `# 📋 Playlist Added to Queue`
      ));
      
      components.push(ContainerBuilder.createTextDisplay(
        `### ${res.playlistInfo.name}`
      ));
      
      components.push(ContainerBuilder.createSeparator());
      
      const playlistInfo = [
        `**Tracks:** ${res.tracks.length}`,
        `**Duration:** \`${totalDuration}\``,
        `**Requested by:** @${member.user.username}`
      ].join(' • ');
      
      components.push(ContainerBuilder.createTextDisplay(playlistInfo));
      
      const container = new ContainerBuilder()
        .addContainer({ accentColor: 0xA855F7, components })
        .build();
      
      embed = container;
      break;

    case "SEARCH_RESULT": {
      let max = guild.client.config.MUSIC.MAX_SEARCH_RESULTS;
      if (res.tracks.length < max) max = res.tracks.length;

      const results = res.tracks.slice(0, max);
      const options = results.map((result, index) => ({
        label: result.info.title.length > 100 ? result.info.title.slice(0, 97) + "..." : result.info.title, // Truncate title
        value: index.toString(),
      }));

      const menuRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("search-results")
          .setPlaceholder("Choose Search Results")
          .setMaxValues(max)
          .addOptions(options)
      );

      // Use container UI for search results
      const searchComponents = [];
      
      searchComponents.push(ContainerBuilder.createTextDisplay(
        `# 🔍 Search Results`
      ));
      
      searchComponents.push(ContainerBuilder.createTextDisplay(
        `**Found ${max} results**\n\nSelect the songs you wish to add to the queue from the menu below.`
      ));
      
      searchComponents.push(ContainerBuilder.createSeparator());
      
      // Show preview of top 3 results
      const previewResults = results.slice(0, 3).map((result, index) => {
        const trackTitle = result.info.title.length > 50 ? result.info.title.slice(0, 47) + "..." : result.info.title;
        const trackAuthor = (result.info.author || 'Unknown').substring(0, 30);
        const duration = prettyMs(result.info.length || 0, { colonNotation: true });
        return `**${index + 1}.** ${trackTitle}\n     ${trackAuthor} • \`${duration}\``;
      }).join('\n\n');
      
      searchComponents.push(ContainerBuilder.createTextDisplay(previewResults));
      
      if (max > 3) {
        searchComponents.push(ContainerBuilder.createTextDisplay(
          `\n*+${max - 3} more results available*`
        ));
      }
      
      const searchContainer = new ContainerBuilder()
        .addContainer({ accentColor: 0x3B82F6, components: searchComponents })
        .build();

      const sentMsg = await channel.send({
        ...searchContainer,
        components: [menuRow],
      });

      try {
        const response = await channel.awaitMessageComponent({
          filter: (reactor) => reactor.message.id === sentMsg.id && reactor.user.id === member.id,
          idle: 30 * 1000,
          componentType: ComponentType.StringSelect,
        });

        await sentMsg.delete();
        if (!response) return "🚫 You took too long to select the songs";

        if (response.customId !== "search-results") return;
        const toAdd = [];
        response.values.forEach((v) => toAdd.push(results[v]));

        // Only 1 song is selected
        if (toAdd.length === 1) {
          tracks = [toAdd[0]];
          
          const selectedComponents = [];
          const selectedTrack = toAdd[0];
          const selectedThumbnail = MusicPlayerView.getThumbnailUrl(selectedTrack);
          
          if (selectedThumbnail) {
            selectedComponents.push(ContainerBuilder.createThumbnail(selectedThumbnail));
          }
          
          selectedComponents.push(ContainerBuilder.createTextDisplay(
            `# ✅ Added to Queue`
          ));
          
          const selectedTitle = selectedTrack.info.uri 
            ? `[${selectedTrack.info.title}](${selectedTrack.info.uri})` 
            : `**${selectedTrack.info.title}**`;
          
          selectedComponents.push(ContainerBuilder.createTextDisplay(
            `### ${selectedTitle}\n*${selectedTrack.info.author || 'Unknown Artist'}*`
          ));
          
          selectedComponents.push(ContainerBuilder.createSeparator());
          
          const selectedDuration = prettyMs(selectedTrack.info.length || 0, { colonNotation: true });
          selectedComponents.push(ContainerBuilder.createTextDisplay(
            `**Duration:** \`${selectedDuration}\` • **Requested by:** @${member.user.username}`
          ));
          
          embed = new ContainerBuilder()
            .addContainer({ accentColor: 0x10B981, components: selectedComponents })
            .build();
        } else {
          tracks = toAdd;
          
          const multiComponents = [];
          
          multiComponents.push(ContainerBuilder.createTextDisplay(
            `# 📋 Multiple Tracks Added`
          ));
          
          multiComponents.push(ContainerBuilder.createTextDisplay(
            `**${toAdd.length} songs** added to the queue`
          ));
          
          multiComponents.push(ContainerBuilder.createSeparator());
          
          const totalDuration = prettyMs(
            toAdd.map((t) => t.info.length).reduce((a, b) => a + b, 0),
            { colonNotation: true }
          );
          
          multiComponents.push(ContainerBuilder.createTextDisplay(
            `**Total Duration:** \`${totalDuration}\` • **Requested by:** @${member.user.username}`
          ));
          
          embed = new ContainerBuilder()
            .addContainer({ accentColor: 0x10B981, components: multiComponents })
            .build();
        }
      } catch (err) {
        guild.client.logger.error("Music search error:", err);
        await sentMsg.delete();
        return "🚫 Failed to register your response";
      }
    }
  }

  // create a player and/or join the member's vc
  if (!player) {
    player = guild.client.musicManager.createConnection({
      guildId: guild.id,
      voiceChannel: member.voice.channel.id,
      textChannel: channel.id,
      deaf: true
    });
    player.data = player.data || {};
  }

  // do queue things
  const started = player.playing || player.paused;
  for (const track of tracks) {
    track.requester = member.user;
    player.queue.add(track);
  }
  if (!started) {
    player.play();
  }

  // Return container if it's a container object, otherwise return embed
  if (embed && embed.components) {
    return embed;
  }
  return { embeds: [embed] };
}
