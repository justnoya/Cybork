const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const ContainerBuilder = require("@helpers/ContainerBuilder");
const prettyMs = require("pretty-ms");
const emojiManager = require("@helpers/EmojiManager");
const { EMBED_COLORS } = require("@root/config");

class MusicPlayerView {
  static THEME = {
    BOT_EMBED: parseInt(EMBED_COLORS.BOT_EMBED.replace('#', ''), 16),
    ACCENT: 0x8B5CF6,
    PURPLE: 0xA855F7,
    GREEN: 0x10B981,
    RED: 0xEF4444,
  };

  static get EMOJIS() {
    return {
      MUSIC: emojiManager.music,
      CASSETTE: '📼',
      HEADPHONES: emojiManager.headphones,
      VINYL: '💿',
      CD: '💿',
      SPEAKER: emojiManager.speaker,
      VOLUME_LOW: emojiManager.volume_down,
      VOLUME_MED: emojiManager.volume_up,
      VOLUME_MUTE: emojiManager.mute,
      PLAY: emojiManager.play,
      PAUSE: emojiManager.pause,
      NEXT: emojiManager.skip,
      PREV: emojiManager.previous,
      STOP: emojiManager.stop,
      SHUFFLE: emojiManager.shuffle,
      REPEAT: emojiManager.repeat,
      REPEAT_ONE: '🔂',
      CLOCK: emojiManager.clock,
      QUEUE: emojiManager.queue,
      STAR: emojiManager.star,
      FIRE: emojiManager.fire,
      CHECK: emojiManager.check,
      NOTES: '🎶',
      ARROW: '→',
      SPARKLES: emojiManager.sparkles,
      BOLT: emojiManager.bolt,
      EQUALIZER: emojiManager.equalizer,
    };
  }

  static getVolumeEmoji(volume = 100) {
    if (volume === 0) return this.EMOJIS.VOLUME_MUTE;
    if (volume < 33) return this.EMOJIS.VOLUME_LOW;
    return this.EMOJIS.VOLUME_MED;
  }

  static getVolumeBar(volume = 100) {
    const bars = Math.min(10, Math.max(0, Math.round(volume / 10)));
    const filled = '▰';
    const empty = '▱';
    return filled.repeat(bars) + empty.repeat(10 - bars);
  }

  static formatDuration(ms) {
    return prettyMs(ms || 0, { colonNotation: true, secondsDecimalDigits: 0 });
  }

  static getThumbnailUrl(track) {
    const trackInfo = track.info || track;
    const uri = trackInfo.uri || track.uri;
    const sourceName = trackInfo.sourceName || track.sourceName || trackInfo.source || track.source;
    const identifier = trackInfo.identifier || track.identifier;
    
    // Priority 1: Check for explicit artwork URL (Lavalink v4+ or custom)
    if (trackInfo.artworkUrl || track.artworkUrl) {
      return trackInfo.artworkUrl || track.artworkUrl;
    }
    
    // Priority 2: Check for thumbnail field
    if (trackInfo.thumbnail || track.thumbnail) {
      return trackInfo.thumbnail || track.thumbnail;
    }
    
    // Priority 3: Check plugin info (for Spotify, SoundCloud via plugins)
    if (track.pluginInfo?.artworkUrl || trackInfo.pluginInfo?.artworkUrl) {
      return track.pluginInfo?.artworkUrl || trackInfo.pluginInfo?.artworkUrl;
    }
    
    // Priority 4: YOUTUBE - Multiple extraction methods
    if (sourceName === "youtube" || sourceName === "yt" || sourceName === "ytmusic" || uri?.includes('youtube.com') || uri?.includes('youtu.be')) {
      let videoId = null;
      
      // Method 1: Direct identifier (for Lavalink v4) - most reliable
      if (identifier && !identifier.includes(':') && !identifier.includes('/')) {
        const cleanId = identifier.split('?')[0].split('&')[0];
        if (cleanId.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(cleanId)) {
          videoId = cleanId;
        }
      }
      
      // Method 2: Extract from youtube.com/watch?v= URL
      if (!videoId && uri?.includes('youtube.com/watch?v=')) {
        const match = uri.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        if (match && match[1]) {
          videoId = match[1];
        }
      }
      
      // Method 3: Extract from youtu.be/ short URL
      if (!videoId && uri?.includes('youtu.be/')) {
        const match = uri.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        if (match && match[1]) {
          videoId = match[1];
        }
      }
      
      // Method 4: Extract from /v/ or /embed/ URL
      if (!videoId && uri) {
        const match = uri.match(/\/(?:v|embed)\/([a-zA-Z0-9_-]{11})/);
        if (match && match[1]) {
          videoId = match[1];
        }
      }
      
      // Method 5: Try raw identifier as last resort
      if (!videoId && identifier && identifier.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(identifier)) {
        videoId = identifier;
      }
      
      if (videoId && videoId.length === 11) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }
    
    // Priority 5: SOUNDCLOUD - Try to extract artwork
    if (sourceName === "soundcloud" || sourceName === "sc" || uri?.includes('soundcloud.com')) {
      if (trackInfo.artwork || track.artwork) {
        return trackInfo.artwork || track.artwork;
      }
      if (trackInfo.artworkURL || track.artworkURL) {
        return trackInfo.artworkURL || track.artworkURL;
      }
    }
    
    return null;
  }

  static createProgressBar(current, total, length = 18) {
    if (!total || total === 0) return '▱'.repeat(length);
    const progress = Math.min(Math.max(current / total, 0), 1);
    const filledLength = Math.round(length * progress);
    const emptyLength = length - filledLength;
    return '▰'.repeat(filledLength) + '▱'.repeat(emptyLength);
  }

  static createEnqueuedCard(track, requester, position = null, queueLength = 0) {
    const trackInfo = track.info || track;
    const title = trackInfo.title || 'Unknown Track';
    const author = trackInfo.author || 'Unknown Artist';
    const duration = this.formatDuration(trackInfo.length || 0);
    const thumbnail = this.getThumbnailUrl(track);
    
    const components = [];
    
    if (thumbnail) {
      components.push(ContainerBuilder.createThumbnail(thumbnail));
    }
    
    components.push(ContainerBuilder.createTextDisplay(
      `# ${this.EMOJIS.MUSIC} Enqueued Track`
    ));
    
    const titleMarkdown = trackInfo.uri 
      ? `[${title}](${trackInfo.uri})` 
      : `**${title}**`;
    
    components.push(ContainerBuilder.createTextDisplay(
      `### ${this.EMOJIS.CHECK} Added ${titleMarkdown} to the queue.`
    ));
    
    components.push(ContainerBuilder.createSeparator());
    
    const infoText = [
      `**Duration :** ${duration}`,
      `**Requestor :** @${requester}`,
      position !== null ? `**Position :** ${position}` : null
    ].filter(Boolean).join(' • ');
    
    components.push(ContainerBuilder.createTextDisplay(infoText));
    
    const container = new ContainerBuilder()
      .addContainer({ accentColor: this.THEME.BOT_EMBED, components })
      .build();
    
    return container;
  }

  static createEmptyQueueDisplay() {
    const components = [];

    components.push(ContainerBuilder.createTextDisplay(
      `# ${this.EMOJIS.MUSIC} Music Player\n\n` +
      `**No music playing**\n` +
      `Use \`/play\` to start playing music!`
    ));

    components.push(ContainerBuilder.createSeparator());

    components.push(ContainerBuilder.createTextDisplay(
      `### ${this.EMOJIS.HEADPHONES} Quick Start\n` +
      `> ${this.EMOJIS.PLAY} Play a song or playlist\n` +
      `> ${this.EMOJIS.QUEUE} Build your queue\n` +
      `> ${this.EMOJIS.SHUFFLE} Shuffle for variety`
    ));

    const container = new ContainerBuilder()
      .addContainer({ accentColor: this.THEME.BOT_EMBED, components })
      .build();

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('music_queue_view')
        .setLabel('Queue')
        .setEmoji(this.EMOJIS.QUEUE)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('music_previous')
        .setEmoji(this.EMOJIS.PREV)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('music_play')
        .setEmoji(this.EMOJIS.PLAY)
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('music_next')
        .setEmoji(this.EMOJIS.NEXT)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('music_stop')
        .setEmoji(this.EMOJIS.STOP)
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true)
    );

    container.components.push(row1);
    return container;
  }

  static createNowPlayingDisplay(player, requester, interaction, lastInteractionTime = null) {
    const track = player.queue.current;
    const queue = player.queue.tracks || [];
    const volume = player.volume || 100;
    const isPaused = player.paused;
    const loopMode = player.queue.loop || 0;

    const trackInfo = track.info || track;
    const title = trackInfo.title || 'Unknown Track';
    const author = trackInfo.author || 'Unknown Artist';
    const currentTime = player.position || 0;
    const totalTime = trackInfo.length || 0;
    const currentTimeStr = this.formatDuration(currentTime);
    const totalTimeStr = this.formatDuration(totalTime);
    const volumeEmoji = this.getVolumeEmoji(volume);

    const components = [];

    const thumbnail = this.getThumbnailUrl(track);
    if (thumbnail) {
      components.push(ContainerBuilder.createThumbnail(thumbnail));
    }

    const titleLink = trackInfo.uri ? `[${title}](${trackInfo.uri})` : title;
    const statusIcon = isPaused ? this.EMOJIS.PAUSE : this.EMOJIS.PLAY;
    const loopIcon = loopMode === 1 ? this.EMOJIS.REPEAT_ONE : loopMode === 2 ? this.EMOJIS.REPEAT : '';
    
    components.push(ContainerBuilder.createTextDisplay(
      `# ${this.EMOJIS.HEADPHONES} Now Playing`
    ));

    components.push(ContainerBuilder.createTextDisplay(
      `### **${titleLink}**\n*${author}*`
    ));

    components.push(ContainerBuilder.createSeparator());

    const progressBar = this.createProgressBar(currentTime, totalTime, 18);
    components.push(ContainerBuilder.createTextDisplay(
      `${progressBar}\n\`${currentTimeStr}\` ${this.EMOJIS.ARROW} \`${totalTimeStr}\``
    ));

    components.push(ContainerBuilder.createSeparator());

    const statusParts = [
      `${statusIcon} **${isPaused ? 'Paused' : 'Playing'}**`,
      loopIcon ? `${loopIcon} **Loop**` : null,
      `${volumeEmoji} **${volume}%**`
    ].filter(Boolean).join(' • ');

    components.push(ContainerBuilder.createTextDisplay(
      `${statusParts}\n**Requested by:** @${requester}`
    ));

    if (queue.length > 0) {
      components.push(ContainerBuilder.createSeparator());
      
      const upNext = queue.slice(0, 3).map((t, i) => {
        const tInfo = t.info || t;
        const trackTitle = (tInfo.title || 'Unknown').substring(0, 45);
        const trackDuration = this.formatDuration(tInfo.length || 0);
        return `**${i + 1}.** ${trackTitle} \`${trackDuration}\``;
      }).join('\n');

      const moreText = queue.length > 3 ? `\n*+${queue.length - 3} more tracks*` : '';
      
      components.push(ContainerBuilder.createTextDisplay(
        `### ${this.EMOJIS.QUEUE} Up Next (${queue.length})\n` +
        upNext +
        moreText
      ));
    }

    const container = new ContainerBuilder()
      .addContainer({ accentColor: this.THEME.BOT_EMBED, components })
      .build();

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('music_queue_view')
        .setLabel('Queue')
        .setEmoji(this.EMOJIS.QUEUE)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_previous')
        .setEmoji(this.EMOJIS.PREV)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(isPaused ? 'music_resume' : 'music_pause')
        .setEmoji(isPaused ? this.EMOJIS.PLAY : this.EMOJIS.PAUSE)
        .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('music_next')
        .setEmoji(this.EMOJIS.NEXT)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('music_stop')
        .setEmoji(this.EMOJIS.STOP)
        .setStyle(ButtonStyle.Danger)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('music_shuffle')
        .setEmoji(this.EMOJIS.SHUFFLE)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_loop')
        .setEmoji(this.EMOJIS.REPEAT)
        .setStyle(loopMode > 0 ? ButtonStyle.Success : ButtonStyle.Secondary),
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
        .setEmoji(this.EMOJIS.CLOCK)
        .setStyle(ButtonStyle.Secondary)
    );

    container.components.push(row1, row2);
    return container;
  }

  static createNowPlayingWithCard(player, requester, cardBuffer) {
    const track = player.queue.current;
    const queue = player.queue.tracks || [];
    const volume = player.volume || 100;
    const isPaused = player.paused;
    const loopMode = player.queue.loop || 0;

    const trackInfo = track.info || track;

    const components = [];

    // Add the generated card image
    if (cardBuffer) {
      components.push(ContainerBuilder.createThumbnail('attachment://now-playing.png'));
    }

    // Add live status indicator
    const statusIcon = isPaused ? this.EMOJIS.PAUSE : this.EMOJIS.PLAY;
    const loopIcon = loopMode === 1 ? this.EMOJIS.REPEAT_ONE : loopMode === 2 ? this.EMOJIS.REPEAT : '';
    
    const statusParts = [
      `${statusIcon} **${isPaused ? 'Paused' : 'Playing'}**`,
      loopIcon ? `${loopIcon} **Loop**` : null,
      `${this.getVolumeEmoji(volume)} **${volume}%**`
    ].filter(Boolean).join(' • ');

    components.push(ContainerBuilder.createTextDisplay(statusParts));

    // Add up next if queue has items
    if (queue.length > 0) {
      components.push(ContainerBuilder.createSeparator());
      
      const upNext = queue.slice(0, 2).map((t, i) => {
        const tInfo = t.info || t;
        const trackTitle = (tInfo.title || 'Unknown').substring(0, 40);
        const trackDuration = this.formatDuration(tInfo.length || 0);
        return `**${i + 1}.** ${trackTitle} \`${trackDuration}\``;
      }).join('\n');

      const moreText = queue.length > 2 ? `\n*+${queue.length - 2} more in queue*` : '';
      
      components.push(ContainerBuilder.createTextDisplay(
        `### ${this.EMOJIS.QUEUE} Up Next (${queue.length})\n` +
        upNext +
        moreText
      ));
    }

    const container = new ContainerBuilder()
      .addContainer({ accentColor: this.THEME.BOT_EMBED, components })
      .build();

    // Add controls inside the container
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('music_queue_view')
        .setLabel('Queue')
        .setEmoji(this.EMOJIS.QUEUE)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_previous')
        .setEmoji(this.EMOJIS.PREV)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(isPaused ? 'music_resume' : 'music_pause')
        .setEmoji(isPaused ? this.EMOJIS.PLAY : this.EMOJIS.PAUSE)
        .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('music_next')
        .setEmoji(this.EMOJIS.NEXT)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('music_stop')
        .setEmoji(this.EMOJIS.STOP)
        .setStyle(ButtonStyle.Danger)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('music_shuffle')
        .setEmoji(this.EMOJIS.SHUFFLE)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_loop')
        .setEmoji(this.EMOJIS.REPEAT)
        .setStyle(loopMode > 0 ? ButtonStyle.Success : ButtonStyle.Secondary),
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
        .setEmoji(this.EMOJIS.CLOCK)
        .setStyle(ButtonStyle.Secondary)
    );

    container.components.push(row1, row2);
    return container;
  }

  static createQueueDisplay(player, requester, page = 1) {
    const queue = player.queue.tracks || [];
    const track = player.queue.current;
    const itemsPerPage = 10;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const tracksToShow = queue.slice(start, end);
    const totalPages = Math.ceil(queue.length / itemsPerPage) || 1;

    const components = [];

    const thumbnail = track ? this.getThumbnailUrl(track) : null;
    if (thumbnail) {
      components.push(ContainerBuilder.createThumbnail(thumbnail));
    }

    const totalSongs = track ? queue.length + 1 : queue.length;
    const currentTrackDuration = track ? ((track.info || track).length || 0) : 0;
    const queueDuration = queue.reduce((acc, t) => acc + ((t.info || t).length || 0), 0);
    const totalDuration = currentTrackDuration + queueDuration;
    const totalDurationStr = this.formatDuration(totalDuration);

    components.push(ContainerBuilder.createTextDisplay(
      `# ${this.EMOJIS.QUEUE} Music Queue`
    ));

    components.push(ContainerBuilder.createTextDisplay(
      `**${totalSongs} tracks** • **${totalDurationStr}** total • Page **${page}/${totalPages}**`
    ));

    components.push(ContainerBuilder.createSeparator());

    if (track) {
      const trackInfo = track.info || track;
      const title = (trackInfo.title || 'Unknown Track').substring(0, 50);
      const author = trackInfo.author || 'Unknown Artist';
      const duration = this.formatDuration(trackInfo.length || 0);
      const titleLink = trackInfo.uri ? `[${title}](${trackInfo.uri})` : title;

      components.push(ContainerBuilder.createTextDisplay(
        `### ${this.EMOJIS.PLAY} Now Playing\n` +
        `**${titleLink}**\n` +
        `${author} • \`${duration}\` • Requested by @${requester}`
      ));
    }

    if (tracksToShow.length > 0) {
      components.push(ContainerBuilder.createSeparator());
      
      const queueList = tracksToShow.map((t, i) => {
        const position = start + i + 1;
        const tInfo = t.info || t;
        const trackTitle = (tInfo.title || 'Unknown').substring(0, 42);
        const trackAuthor = (tInfo.author || 'Unknown Artist').substring(0, 30);
        const trackDuration = this.formatDuration(tInfo.length || 0);
        const tRequester = t.requester || requester;
        return `**${position}.** ${trackTitle}\n     ${trackAuthor} • \`${trackDuration}\` • @${tRequester}`;
      }).join('\n\n');

      components.push(ContainerBuilder.createTextDisplay(
        `### ${this.EMOJIS.NOTES} Up Next\n` +
        queueList
      ));
    } else if (queue.length === 0) {
      components.push(ContainerBuilder.createSeparator());
      components.push(ContainerBuilder.createTextDisplay(
        `*Queue is empty*\n` +
        `Use \`/play\` to add songs!`
      ));
    }

    const container = new ContainerBuilder()
      .addContainer({ accentColor: this.THEME.BOT_EMBED, components })
      .build();

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('music_back_to_player')
        .setEmoji('◀️')
        .setLabel('Back')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`queue_page_${Math.max(1, page - 1)}`)
        .setEmoji('⬅️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page <= 1),
      new ButtonBuilder()
        .setCustomId(`queue_page_info`)
        .setLabel(`${page}/${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`queue_page_${Math.min(totalPages, page + 1)}`)
        .setEmoji('➡️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page >= totalPages)
    );

    container.components.push(row1);
    return container;
  }

  static createHistoryDisplay(playerHistory = [], page = 1) {
    const itemsPerPage = 8;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const tracksToShow = playerHistory.slice(start, end);
    const totalPages = Math.ceil(playerHistory.length / itemsPerPage) || 1;

    const components = [];

    components.push(ContainerBuilder.createTextDisplay(
      `# ${this.EMOJIS.CLOCK} Playback History\n\n` +
      `**Total Tracks:** ${playerHistory.length}\n` +
      `**Page ${page} of ${totalPages}**`
    ));

    if (tracksToShow.length > 0) {
      components.push(ContainerBuilder.createSeparator());
      
      const historyList = tracksToShow.map((track, i) => {
        const position = start + i + 1;
        const title = (track.title || 'Unknown').length > 40 ? track.title.substring(0, 37) + '...' : track.title;
        const author = track.author || 'Unknown Artist';
        const duration = this.formatDuration(track.length || 0);
        return `**${position}.** ${title}\n${author} • \`${duration}\``;
      }).join('\n\n');

      components.push(ContainerBuilder.createTextDisplay(
        `### ${this.EMOJIS.VINYL} Recently Played\n` +
        historyList
      ));
    } else {
      components.push(ContainerBuilder.createSeparator());
      components.push(ContainerBuilder.createTextDisplay(
        `*No playback history available*`
      ));
    }

    const container = new ContainerBuilder()
      .addContainer({ accentColor: this.THEME.BOT_EMBED, components })
      .build();

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('music_back_to_player')
        .setEmoji('◀️')
        .setLabel('Back')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`history_page_${Math.max(1, page - 1)}`)
        .setEmoji('⬅️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page <= 1),
      new ButtonBuilder()
        .setCustomId(`history_page_info`)
        .setLabel(`${page}/${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`history_page_${Math.min(totalPages, page + 1)}`)
        .setEmoji('➡️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page >= totalPages)
    );

    container.components.push(row1);
    return container;
  }
}

module.exports = MusicPlayerView;
