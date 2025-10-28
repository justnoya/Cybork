const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const ContainerBuilder = require("@helpers/ContainerBuilder");
const prettyMs = require("pretty-ms");

class MusicPlayerView {
  static THEME = {
    PURPLE: 0x9B59B6,
    BLUE: 0x5865F2,
    GREEN: 0x57F287,
    RED: 0xED4245,
    ORANGE: 0xF26522,
    WHITE: 0xFFFFFF,
  };

  static EMOJIS = {
    MUSIC: '🎵',
    CASSETTE: '📼',
    HEADPHONES: '🎧',
    VINYL: '💿',
    SPEAKER: '🔊',
    VOLUME_LOW: '🔉',
    VOLUME_MED: '🔊',
    VOLUME_MUTE: '🔇',
    PLAY: '▶️',
    PAUSE: '⏸️',
    NEXT: '⏭️',
    PREV: '⏮️',
    STOP: '⏹️',
    SHUFFLE: '🔀',
    REPEAT: '🔁',
    CLOCK: '🕐',
    QUEUE: '📋',
    STAR: '⭐',
    FIRE: '🔥',
  };

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
    if (trackInfo.sourceName === "youtube" || track.sourceName === "youtube") {
      const identifier = trackInfo.identifier || track.identifier;
      if (identifier) {
        return `https://img.youtube.com/vi/${identifier}/hqdefault.jpg`;
      }
    }
    return null;
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
      .addContainer({ accentColor: this.THEME.BLUE, components })
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
    const duration = this.formatDuration(trackInfo.length || 0);
    const volumeBar = this.getVolumeBar(volume);
    const volumeEmoji = this.getVolumeEmoji(volume);

    const components = [];

    const thumbnail = this.getThumbnailUrl(track);
    if (thumbnail) {
      components.push(ContainerBuilder.createThumbnail(thumbnail));
    }

    const statusIcon = isPaused ? this.EMOJIS.PAUSE : this.EMOJIS.PLAY;
    const loopIcon = loopMode === 1 ? `${this.EMOJIS.REPEAT} Track` : loopMode === 2 ? `${this.EMOJIS.REPEAT} Queue` : '';
    
    components.push(ContainerBuilder.createTextDisplay(
      `# ${this.EMOJIS.MUSIC} Now Playing\n\n` +
      `**${title}**\n` +
      `*${author}*`
    ));

    components.push(ContainerBuilder.createSeparator());

    components.push(ContainerBuilder.createTextDisplay(
      `### ${this.EMOJIS.VINYL} Track Info\n` +
      `> **Duration:** ${duration}\n` +
      `> **Status:** ${statusIcon} ${isPaused ? 'Paused' : 'Playing'}\n` +
      (loopIcon ? `> **Loop:** ${loopIcon}\n` : '') +
      `> **Requested by:** @${requester}`
    ));

    components.push(ContainerBuilder.createSeparator());

    components.push(ContainerBuilder.createTextDisplay(
      `### ${volumeEmoji} Volume: ${volume}%\n` +
      `${volumeBar}`
    ));

    if (queue.length > 0) {
      components.push(ContainerBuilder.createSeparator());
      
      const upNext = queue.slice(0, 3).map((t, i) => {
        const tInfo = t.info || t;
        const trackTitle = tInfo.title || 'Unknown';
        const trackDuration = this.formatDuration(tInfo.length || 0);
        return `**${i + 1}.** ${trackTitle} \`[${trackDuration}]\``;
      }).join('\n');

      const moreText = queue.length > 3 ? `\n*...and ${queue.length - 3} more*` : '';
      
      components.push(ContainerBuilder.createTextDisplay(
        `### ${this.EMOJIS.QUEUE} Up Next (${queue.length} song${queue.length !== 1 ? 's' : ''})\n` +
        upNext +
        moreText
      ));
    }

    const container = new ContainerBuilder()
      .addContainer({ accentColor: this.THEME.PURPLE, components })
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

  static createQueueDisplay(player, requester, page = 1) {
    const queue = player.queue.tracks || [];
    const track = player.queue.current;
    const itemsPerPage = 8;
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
    components.push(ContainerBuilder.createTextDisplay(
      `# ${this.EMOJIS.QUEUE} Queue\n\n` +
      `**Total Songs:** ${totalSongs}\n` +
      `**Page ${page} of ${totalPages}**`
    ));

    components.push(ContainerBuilder.createSeparator());

    if (track) {
      const trackInfo = track.info || track;
      const title = trackInfo.title || 'Unknown Track';
      const author = trackInfo.author || 'Unknown Artist';
      const duration = this.formatDuration(trackInfo.length || 0);

      components.push(ContainerBuilder.createTextDisplay(
        `### ${this.EMOJIS.PLAY} Now Playing\n` +
        `**${title}**\n` +
        `${author} • \`${duration}\`\n` +
        `*Requested by @${requester}*`
      ));
    }

    if (tracksToShow.length > 0) {
      components.push(ContainerBuilder.createSeparator());
      
      const queueList = tracksToShow.map((t, i) => {
        const position = start + i + 1;
        const tInfo = t.info || t;
        const trackTitle = (tInfo.title || 'Unknown').length > 40 ? tInfo.title.substring(0, 37) + '...' : tInfo.title;
        const trackAuthor = tInfo.author || 'Unknown Artist';
        const trackDuration = this.formatDuration(tInfo.length || 0);
        const tRequester = t.requester || requester;
        return `**${position}.** ${trackTitle}\n${trackAuthor} • \`${trackDuration}\` • @${tRequester}`;
      }).join('\n\n');

      components.push(ContainerBuilder.createTextDisplay(
        `### ${this.EMOJIS.FIRE} Up Next\n` +
        queueList
      ));
    } else if (queue.length === 0) {
      components.push(ContainerBuilder.createSeparator());
      components.push(ContainerBuilder.createTextDisplay(
        `*No songs in queue*\n` +
        `Use \`/play\` to add more songs!`
      ));
    }

    const container = new ContainerBuilder()
      .addContainer({ accentColor: this.THEME.BLUE, components })
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
      .addContainer({ accentColor: this.THEME.ORANGE, components })
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
