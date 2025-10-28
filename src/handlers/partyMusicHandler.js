const { createAudioResource, StreamType, AudioPlayerStatus } = require("@discordjs/voice");
const MusicPlayerView = require("@helpers/MusicPlayerView");
const MusicPlayerCard = require("@helpers/MusicPlayerCard");
const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const play = require("play-dl");

class PartyMusicHandler {
  constructor(client) {
    this.client = client;
    this.currentlyPlaying = new Map();
    this.client.logger.log("Party Music Handler initialized");
  }

  async startPlayback(party) {
    if (party.queue.length === 0) {
      this.client.logger.log(`Party ${party.partyId} queue is empty`);
      return;
    }

    const player = this.client.partyManager.getPlayer(party.partyId);
    if (!player) {
      this.client.logger.error(`No player found for party ${party.partyId}`);
      return;
    }

    if (this.currentlyPlaying.has(party.partyId)) {
      this.client.logger.log(`Party ${party.partyId} is already playing`);
      return;
    }

    const currentTrack = party.queue.shift();
    if (!currentTrack) return;

    party.currentTrack = {
      title: currentTrack.title,
      author: currentTrack.author,
      uri: currentTrack.uri,
      duration: currentTrack.duration,
      startedAt: new Date(),
    };

    await party.save();

    this.currentlyPlaying.set(party.partyId, currentTrack);

    try {
      let stream;
      
      if (currentTrack.uri && currentTrack.uri.includes("youtube.com")) {
        stream = await play.stream(currentTrack.uri);
        
        const resource = createAudioResource(stream.stream, {
          inputType: stream.type,
          inlineVolume: true,
        });

        player.play(resource);

        this.client.logger.log(`Started playing in party ${party.partyId}: ${currentTrack.title}`);

        this.sendNowPlayingMessage(party, currentTrack);
      } else {
        this.client.logger.error(`Unsupported track URI format: ${currentTrack.uri}`);
        this.currentlyPlaying.delete(party.partyId);
        if (party.queue.length > 0) {
          await this.startPlayback(party);
        }
      }
    } catch (error) {
      this.client.logger.error(`Error playing track in party ${party.partyId}:`, error);
      this.currentlyPlaying.delete(party.partyId);
      
      if (party.textChannelId) {
        const channel = this.client.channels.cache.get(party.textChannelId);
        if (channel) {
          channel.send(`❌ Error playing **${currentTrack.title}**. Skipping to next track...`).catch(() => {});
        }
      }

      if (party.queue.length > 0) {
        await this.startPlayback(party);
      }
    }
  }

  async sendNowPlayingMessage(party, track) {
    if (!party.textChannelId) return;

    const channel = this.client.channels.cache.get(party.textChannelId);
    if (!channel) return;

    try {
      const mockPlayer = {
        position: 0,
        volume: 100,
        paused: false,
        queue: { loop: 0 },
      };

      const mockTrack = {
        info: {
          title: track.title,
          author: track.author,
          length: track.duration,
          uri: track.uri,
          sourceName: "youtube",
          identifier: track.uri ? track.uri.split("v=")[1] : null,
        },
      };

      const cardBuffer = await Promise.race([
        MusicPlayerCard.generateNowPlayingCard(mockTrack, mockPlayer, track.requestedBy),
        new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);

      if (cardBuffer) {
        const attachment = new AttachmentBuilder(cardBuffer, { name: "party-now-playing.png" });

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`party:skip:${party.partyId}`)
            .setLabel("Vote Skip")
            .setEmoji("⏭️")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`party:info:${party.partyId}`)
            .setLabel("Party Info")
            .setEmoji("ℹ️")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`party:queue:${party.partyId}`)
            .setLabel("Queue")
            .setEmoji("📋")
            .setStyle(ButtonStyle.Secondary)
        );

        await channel.send({
          content: `🎵 **Now Playing in Party** • ${party.members.length} listeners`,
          files: [attachment],
          components: [row1],
        });
      } else {
        await channel.send(
          `🎵 **Now Playing:** ${track.title}\n` +
            `**Artist:** ${track.author}\n` +
            `**Requested by:** @${track.requestedBy}\n` +
            `**Party Members:** ${party.members.length}`
        );
      }
    } catch (error) {
      this.client.logger.error("Error sending now playing message:", error);
    }
  }

  setupPlayerEvents(partyId, player) {
    player.on(AudioPlayerStatus.Idle, async () => {
      this.currentlyPlaying.delete(partyId);
      
      const party = await this.client.partyManager.getParty(partyId);
      if (!party) return;

      party.currentTrack = null;
      party.votes.skip = [];
      await party.save();

      if (party.queue.length > 0 && party.settings.autoplay) {
        setTimeout(() => this.startPlayback(party), 1000);
      } else {
        if (party.textChannelId) {
          const channel = this.client.channels.cache.get(party.textChannelId);
          if (channel) {
            channel.send("🎵 Queue finished! Add more songs with `/party-play <song>`").catch(() => {});
          }
        }
      }
    });

    player.on(AudioPlayerStatus.Playing, () => {
      this.client.logger.log(`Party ${partyId} player is now playing`);
    });

    player.on("error", (error) => {
      this.client.logger.error(`Party ${partyId} player error:`, error);
      this.currentlyPlaying.delete(partyId);
    });
  }
}

module.exports = PartyMusicHandler;
