const axios = require('axios');
const emojiManager = require('@helpers/EmojiManager');

class MusicPlayerCard {
  static async generateNowPlayingCard(track, player, requester) {
    try {
      // Text-based card instead of canvas
      const trackInfo = track.info || track;
      const title = trackInfo.title || 'Unknown Track';
      const artist = trackInfo.author || 'Unknown Artist';
      const thumbnail = this.getThumbnailUrl(track);
      
      const currentTime = player.position || 0;
      const totalTime = trackInfo.length || 0;
      const volume = player.volume || 100;
      const isPaused = player.paused;
      
      return {
        type: 'text',
        content: `🎵 **Now Playing**\n\`\`\`${title}\n${artist}\`\`\`\n⏱️ ${this.formatTime(currentTime)}/${this.formatTime(totalTime)}\n🔊 Volume: ${volume}%\n${isPaused ? '⏸️ Paused' : '▶️ Playing'}`
      };
    } catch (err) {
      console.error('Error generating music card:', err);
      return { type: 'text', content: '🎵 Now Playing' };
    }
  }

  static getThumbnailUrl(track) {
    if (!track) return null;
    return track.thumbnail || track.info?.thumbnail || null;
  }

  static formatTime(ms) {
    if (!ms) return '0:00';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

module.exports = MusicPlayerCard;
