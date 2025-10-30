const { ApplicationCommandOptionType, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { MUSIC } = require("@root/config");
const MusicPlayerCard = require("@helpers/MusicPlayerCard");
const MusicPlayerView = require("@helpers/MusicPlayerView");
const emojiManager = require("@helpers/EmojiManager");
const { QueryType, useMainPlayer } = require("discord-player");

/**
 * High-performance play command using discord-player
 * Optimized for handling 50-100+ servers simultaneously
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "play",
  description: "Play music from YouTube, Spotify, SoundCloud, Apple Music, and more",
  category: "MUSIC",
  botPermissions: ["EmbedLinks", "Connect", "Speak"],
  command: {
    enabled: true,
    usage: "<song name or URL>",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "query",
        description: "Song name or URL (YouTube, Spotify, SoundCloud, etc.)",
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
 * Play music with discord-player
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} context
 * @param {string} query
 */
async function play({ member, guild, channel }, query) {
  if (!member.voice.channel) {
    return `${emojiManager.getError()} You need to join a voice channel first!`;
  }

  const botChannel = guild.members.me.voice.channel;
  if (botChannel && member.voice.channel.id !== botChannel.id) {
    return `${emojiManager.getError()} You must be in the same voice channel as me!`;
  }

  const player = useMainPlayer();
  if (!player) {
    guild.client.logger.error("Music player not initialized!");
    return `${emojiManager.getError()} Music system is not ready. Please try again in a moment.`;
  }

  try {
    guild.client.logger.log(`🔎 Searching for: ${query}`);
    
    const searchResult = await player.search(query, {
      requestedBy: member.user,
      searchEngine: QueryType.AUTO,
    });

    if (!searchResult || !searchResult.hasTracks()) {
      guild.client.logger.warn(`No results found for: ${query}`);
      return `${emojiManager.getError()} No results found for **${query}**`;
    }

    guild.client.logger.log(`✅ Found: ${searchResult.tracks.length} track(s)`);

    const queue = player.nodes.create(guild, {
      metadata: {
        channel: channel,
        requestedBy: member.user,
        cardShownByPlayCommand: false,
      },
      selfDeaf: true,
      volume: 100,
      leaveOnEmpty: true,
      leaveOnEmptyCooldown: MUSIC.IDLE_TIME * 1000 || 60000,
      leaveOnEnd: true,
      leaveOnStop: true,
    });

    try {
      if (!queue.connection) {
        await queue.connect(member.voice.channel);
        guild.client.logger.log(`🔌 Connected to voice channel: ${member.voice.channel.name}`);
      }
    } catch (error) {
      guild.client.logger.error("Failed to connect to voice channel:", error);
      queue.delete();
      return `${emojiManager.getError()} Could not join your voice channel!`;
    }

    const wasPlaying = queue.node.isPlaying();

    if (searchResult.playlist) {
      queue.addTrack(searchResult.tracks);
      
      if (!wasPlaying) {
        await queue.node.play();
      }

      return `${emojiManager.music} Added **${searchResult.tracks.length}** tracks from **${searchResult.playlist.title}** to the queue!`;
    } else {
      const track = searchResult.tracks[0];
      queue.addTrack(track);

      if (!wasPlaying) {
        queue.metadata.cardShownByPlayCommand = true;

        try {
          await queue.node.play();
          
          const requester = member.user.username;
          guild.client.logger.log(`🎨 Generating instant music card for: ${track.title}`);

          const cardBuffer = await Promise.race([
            MusicPlayerCard.generateNowPlayingCardV2(track, queue, requester),
            new Promise((resolve) =>
              setTimeout(() => {
                guild.client.logger.warn(`⏱️ Card generation timeout for: ${track.title}`);
                resolve(null);
              }, 7000)
            ),
          ]);

          if (cardBuffer) {
            guild.client.logger.log(`✅ Instant music card generated successfully`);
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
                .setCustomId("music_pause")
                .setEmoji(emojiManager.pause)
                .setStyle(ButtonStyle.Primary),
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
                .setStyle(ButtonStyle.Secondary),
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

            return {
              files: [attachment],
              components: [row1, row2],
            };
          } else {
            guild.client.logger.warn(`⚠️ Card timeout, using fallback display`);
            const display = MusicPlayerView.createNowPlayingDisplayV2(queue, requester);
            return display;
          }
        } catch (error) {
          guild.client.logger.error("Error during playback start:", error);
          return `${emojiManager.music} Now playing: **${track.title}** by ${track.author}`;
        }
      } else {
        return `${emojiManager.music} Added **${track.title}** to the queue! Position: **${queue.tracks.size}**`;
      }
    }
  } catch (error) {
    guild.client.logger.error("Play command error:", error);
    return `${emojiManager.getError()} An error occurred while trying to play music: ${error.message}`;
  }
}
