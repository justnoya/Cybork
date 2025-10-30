const { ApplicationCommandOptionType, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { MUSIC } = require("@root/config");
const MusicPlayerCard = require("@helpers/MusicPlayerCard");
const MusicPlayerView = require("@helpers/MusicPlayerView");
const emojiManager = require("@helpers/EmojiManager");

/**
 * High-performance play command using Riffy + Lavalink
 * Supports YouTube, Spotify, SoundCloud, and more
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "play",
  description: "Play music from YouTube, Spotify, SoundCloud, and more",
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
 * Play music with Riffy + Lavalink
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

  const riffy = guild.client.musicManager;
  if (!riffy) {
    guild.client.logger.error("Riffy music manager not initialized!");
    return `${emojiManager.getError()} Music system is not ready. Please try again in a moment.`;
  }

  try {
    guild.client.logger.log(`🔎 Searching for: ${query}`);
    
    let player = riffy.players.get(guild.id);
    
    if (!player) {
      player = riffy.createConnection({
        guildId: guild.id,
        voiceChannel: member.voice.channel.id,
        textChannel: channel.id,
        deaf: true
      });
      
      player.data = player.data || {};
      guild.client.logger.log(`🎵 Created new player for guild: ${guild.name}`);
    }

    const resolve = await riffy.resolve({
      query: query,
      requester: member.user
    });

    if (!resolve || !resolve.tracks || resolve.tracks.length === 0) {
      guild.client.logger.warn(`No results found for: ${query}`);
      return `${emojiManager.getError()} No results found for **${query}**`;
    }

    guild.client.logger.log(`✅ Found: ${resolve.tracks.length} track(s)`);

    const wasPlaying = player.playing || player.paused;

    if (resolve.loadType === 'playlist' || resolve.loadType === 'PLAYLIST_LOADED') {
      for (const track of resolve.tracks) {
        track.requester = member.user;
        player.queue.add(track);
      }
      
      if (!wasPlaying) {
        player.play();
      }

      return `${emojiManager.music} Added **${resolve.tracks.length}** tracks from **${resolve.playlistInfo?.name || 'playlist'}** to the queue!`;
    } else {
      const track = resolve.tracks[0];
      track.requester = member.user;
      player.queue.add(track);

      if (!wasPlaying) {
        player.data.cardShownByPlayCommand = true;

        try {
          player.play();
          
          const requester = member.user.username;
          guild.client.logger.log(`🎨 Generating instant music card for: ${track.info.title}`);

          const cardBuffer = await Promise.race([
            MusicPlayerCard.generateNowPlayingCard(track, player, requester),
            new Promise((resolve) =>
              setTimeout(() => {
                guild.client.logger.warn(`⏱️ Card generation timeout for: ${track.info.title}`);
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
            const display = MusicPlayerView.createNowPlayingDisplay(player, requester, null, null);
            return display;
          }
        } catch (error) {
          guild.client.logger.error("Error during playback start:", error);
          return `${emojiManager.music} Now playing: **${track.info.title}** by ${track.info.author}`;
        }
      } else {
        return `${emojiManager.music} Added **${track.info.title}** to the queue! Position: **${player.queue.size}**`;
      }
    }
  } catch (error) {
    guild.client.logger.error("Play command error:", error);
    guild.client.logger.error("Stack trace:", error.stack);
    return `${emojiManager.getError()} An error occurred while trying to play music: ${error.message}`;
  }
}
