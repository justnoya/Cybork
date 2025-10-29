const { createCanvas, loadImage, registerFont } = require('canvas');
const axios = require('axios');
const emojiManager = require('@helpers/EmojiManager');

class MusicPlayerCard {
  static async generateNowPlayingCard(track, player, requester) {
    try {
      const trackInfo = track.info || track;
      const title = trackInfo.title || 'Unknown Track';
      const artist = trackInfo.author || 'Unknown Artist';
      const thumbnail = this.getThumbnailUrl(track);
      
      const currentTime = player.position || 0;
      const totalTime = trackInfo.length || 0;
      const volume = player.volume || 100;
      const isPaused = player.paused;
      const loopMode = player.queue.loop || 0;
      
      // Create canvas (wider for better visual appeal)
      const width = 800;
      const height = 400;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      
      // Background gradient (dark purple to dark blue)
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(0.5, '#16213e');
      gradient.addColorStop(1, '#0f3460');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      
      // Add subtle noise texture (optimized for speed)
      for (let i = 0; i < 50; i++) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.03})`;
        ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
      }
      
      // Album artwork section
      const artSize = 280;
      const artX = 40;
      const artY = (height - artSize) / 2;
      
      // Glow effect behind artwork
      ctx.shadowColor = '#8B5CF6';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Draw rounded rectangle for artwork
      this.roundRect(ctx, artX, artY, artSize, artSize, 20);
      ctx.fillStyle = '#2a2a3e';
      ctx.fill();
      
      // Load and draw album artwork
      if (thumbnail) {
        try {
          console.log(`📥 [Thumbnail] Attempting to load: ${thumbnail}`);
          const response = await axios.get(thumbnail, { 
            responseType: 'arraybuffer',
            timeout: 5000,
            headers: { 
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
            },
            maxRedirects: 5,
            validateStatus: (status) => status >= 200 && status < 400
          });
          const img = await loadImage(Buffer.from(response.data));
          
          ctx.save();
          this.roundRect(ctx, artX, artY, artSize, artSize, 20);
          ctx.clip();
          ctx.drawImage(img, artX, artY, artSize, artSize);
          ctx.restore();
          console.log(`✅ [Thumbnail] Successfully loaded and drawn`);
        } catch (err) {
          console.log(`❌ [Thumbnail] Load failed (${err.message}), using fallback`);
          this.drawFallbackArtwork(ctx, artX, artY, artSize);
        }
      } else {
        console.log(`ℹ️ [Thumbnail] No thumbnail URL available, using fallback artwork`);
        this.drawFallbackArtwork(ctx, artX, artY, artSize);
      }
      
      // Reset shadow
      ctx.shadowBlur = 0;
      
      // Add pause overlay if paused
      if (isPaused) {
        this.drawPauseOverlay(ctx, artX, artY, artSize);
      } else {
        // Add music bars animation if playing
        this.drawMusicBars(ctx, artX, artY, artSize);
      }
      
      // Info section
      const infoX = artX + artSize + 40;
      const infoWidth = width - infoX - 40;
      let currentY = 80;
      
      // "Now Playing" label with enhanced styling
      const gradient2 = ctx.createLinearGradient(infoX, currentY, infoX + 200, currentY);
      gradient2.addColorStop(0, '#A855F7');
      gradient2.addColorStop(1, '#EC4899');
      ctx.fillStyle = gradient2;
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('🎵 NOW PLAYING', infoX, currentY);
      currentY += 40;
      
      // Song title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px Arial';
      const maxTitleWidth = infoWidth;
      let displayTitle = title;
      if (ctx.measureText(title).width > maxTitleWidth) {
        while (ctx.measureText(displayTitle + '...').width > maxTitleWidth && displayTitle.length > 0) {
          displayTitle = displayTitle.slice(0, -1);
        }
        displayTitle += '...';
      }
      ctx.fillText(displayTitle, infoX, currentY);
      currentY += 45;
      
      // Artist name
      ctx.fillStyle = '#B4B4B4';
      ctx.font = '24px Arial';
      let displayArtist = artist;
      if (ctx.measureText(artist).width > maxTitleWidth) {
        while (ctx.measureText(displayArtist + '...').width > maxTitleWidth && displayArtist.length > 0) {
          displayArtist = displayArtist.slice(0, -1);
        }
        displayArtist += '...';
      }
      ctx.fillText(displayArtist, infoX, currentY);
      currentY += 50;
      
      // Progress bar
      const barWidth = infoWidth - 20;
      const barHeight = 8;
      const barX = infoX;
      const barY = currentY;
      
      // Progress bar background
      ctx.fillStyle = '#2a2a3e';
      this.roundRect(ctx, barX, barY, barWidth, barHeight, 4);
      ctx.fill();
      
      // Progress bar fill
      const progress = totalTime > 0 ? Math.min(currentTime / totalTime, 1) : 0;
      const progressWidth = barWidth * progress;
      
      const progressGradient = ctx.createLinearGradient(barX, barY, barX + progressWidth, barY);
      progressGradient.addColorStop(0, '#A855F7');
      progressGradient.addColorStop(1, '#EC4899');
      ctx.fillStyle = progressGradient;
      this.roundRect(ctx, barX, barY, progressWidth, barHeight, 4);
      ctx.fill();
      
      // Progress dot
      if (progressWidth > 0) {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(barX + progressWidth, barY + barHeight / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      
      currentY += 30;
      
      // Time labels
      ctx.fillStyle = '#B4B4B4';
      ctx.font = '16px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(this.formatTime(currentTime), barX, currentY);
      ctx.textAlign = 'right';
      ctx.fillText(this.formatTime(totalTime), barX + barWidth, currentY);
      currentY += 40;
      
      // Status badges
      ctx.textAlign = 'left';
      let badgeX = infoX;
      
      // Status badge (Playing/Paused)
      const statusText = isPaused ? `${emojiManager.pause} Paused` : `${emojiManager.play} Playing`;
      const statusColor = isPaused ? '#F59E0B' : '#10B981';
      this.drawBadge(ctx, statusText, badgeX, currentY, statusColor);
      badgeX += ctx.measureText(statusText).width + 35;
      
      // Loop badge
      if (loopMode === 1) {
        this.drawBadge(ctx, `🔂 Repeat One`, badgeX, currentY, '#8B5CF6');
        badgeX += ctx.measureText('🔂 Repeat One').width + 35;
      } else if (loopMode === 2) {
        this.drawBadge(ctx, `${emojiManager.repeat} Repeat All`, badgeX, currentY, '#8B5CF6');
        badgeX += ctx.measureText(`${emojiManager.repeat} Repeat All`).width + 35;
      }
      
      // Volume badge with enhanced visuals
      const volumeEmoji = volume === 0 ? emojiManager.mute : volume < 33 ? emojiManager.volume_down : emojiManager.volume_up;
      const volumeColor = volume === 0 ? '#EF4444' : '#6366F1';
      this.drawBadge(ctx, `${volumeEmoji} ${volume}%`, badgeX, currentY, volumeColor);
      
      // Requested by (bottom)
      ctx.fillStyle = '#7C7C7C';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Requested by ${requester}`, infoX, height - 40);
      
      const buffer = canvas.toBuffer('image/png');
      console.log(`✅ Music card buffer generated successfully (${buffer.length} bytes)`);
      return buffer;
    } catch (error) {
      console.error('❌ Error generating music card:', error.message);
      console.error('Stack trace:', error.stack);
      return null;
    }
  }
  
  static drawFallbackArtwork(ctx, artX, artY, artSize) {
    // Gradient placeholder
    const artGradient = ctx.createLinearGradient(artX, artY, artX + artSize, artY + artSize);
    artGradient.addColorStop(0, '#A855F7');
    artGradient.addColorStop(1, '#EC4899');
    ctx.fillStyle = artGradient;
    ctx.save();
    this.roundRect(ctx, artX, artY, artSize, artSize, 20);
    ctx.fill();
    ctx.restore();
    
    // Music note icon
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 120px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♪', artX + artSize / 2, artY + artSize / 2);
  }
  
  static drawPauseOverlay(ctx, artX, artY, artSize) {
    // Semi-transparent dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.save();
    this.roundRect(ctx, artX, artY, artSize, artSize, 20);
    ctx.fill();
    ctx.restore();
    
    // Pause icon (two vertical bars)
    const iconSize = 80;
    const barWidth = 20;
    const barHeight = 60;
    const barGap = 20;
    const centerX = artX + artSize / 2;
    const centerY = artY + artSize / 2;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 10;
    
    // Left bar
    this.roundRect(ctx, centerX - barGap / 2 - barWidth, centerY - barHeight / 2, barWidth, barHeight, 5);
    ctx.fill();
    
    // Right bar
    this.roundRect(ctx, centerX + barGap / 2, centerY - barHeight / 2, barWidth, barHeight, 5);
    ctx.fill();
    
    ctx.shadowBlur = 0;
  }
  
  static drawMusicBars(ctx, artX, artY, artSize) {
    // Animated music bars in bottom right corner
    const barCount = 4;
    const barWidth = 6;
    const barGap = 4;
    const maxBarHeight = 30;
    const padding = 15;
    
    const startX = artX + artSize - padding - (barCount * (barWidth + barGap));
    const baseY = artY + artSize - padding;
    
    // Random heights for animation effect
    const heights = [
      Math.random() * maxBarHeight * 0.5 + maxBarHeight * 0.3,
      Math.random() * maxBarHeight * 0.7 + maxBarHeight * 0.2,
      Math.random() * maxBarHeight,
      Math.random() * maxBarHeight * 0.6 + maxBarHeight * 0.3
    ];
    
    for (let i = 0; i < barCount; i++) {
      const barX = startX + i * (barWidth + barGap);
      const barHeight = heights[i];
      
      // Gradient for each bar
      const gradient = ctx.createLinearGradient(barX, baseY - barHeight, barX, baseY);
      gradient.addColorStop(0, '#A855F7');
      gradient.addColorStop(1, '#EC4899');
      
      ctx.fillStyle = gradient;
      ctx.shadowColor = '#A855F7';
      ctx.shadowBlur = 8;
      
      this.roundRect(ctx, barX, baseY - barHeight, barWidth, barHeight, 3);
      ctx.fill();
    }
    
    ctx.shadowBlur = 0;
  }
  
  static drawBadge(ctx, text, x, y, color) {
    ctx.font = '14px Arial';
    const textWidth = ctx.measureText(text).width;
    const padding = 8;
    const height = 24;
    
    // Badge background
    ctx.fillStyle = color + '33'; // 20% opacity
    this.roundRect(ctx, x, y - height / 2, textWidth + padding * 2, height, 12);
    ctx.fill();
    
    // Badge text
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + padding, y);
  }
  
  static roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  
  static formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  static getThumbnailUrl(track) {
    const trackInfo = track.info || track;
    const uri = trackInfo.uri || track.uri;
    const sourceName = trackInfo.sourceName || track.sourceName || trackInfo.source || track.source;
    const identifier = trackInfo.identifier || track.identifier;
    
    console.log('🔍 [Thumbnail] Analyzing:', { 
      sourceName, 
      uri: uri?.substring(0, 60),
      identifier: identifier?.substring(0, 60) 
    });
    
    // Check for explicit artwork URL (Lavalink v4+ or custom)
    if (trackInfo.artworkUrl || track.artworkUrl) {
      const artworkUrl = trackInfo.artworkUrl || track.artworkUrl;
      console.log('✅ [Thumbnail] Found artworkUrl');
      return artworkUrl;
    }
    
    if (trackInfo.thumbnail || track.thumbnail) {
      const thumbnail = trackInfo.thumbnail || track.thumbnail;
      console.log('✅ [Thumbnail] Found thumbnail');
      return thumbnail;
    }
    
    if (track.pluginInfo?.artworkUrl || trackInfo.pluginInfo?.artworkUrl) {
      console.log('✅ [Thumbnail] Found pluginInfo.artworkUrl');
      return track.pluginInfo?.artworkUrl || trackInfo.pluginInfo?.artworkUrl;
    }
    
    // YOUTUBE - Multiple extraction methods
    if (sourceName === "youtube" || sourceName === "yt" || sourceName === "ytmusic" || uri?.includes('youtube.com') || uri?.includes('youtu.be')) {
      let videoId = null;
      
      // Method 1: Direct identifier (for Lavalink v4)
      if (identifier && !identifier.includes(':') && !identifier.includes('/') && identifier.length === 11) {
        videoId = identifier;
        console.log('✅ [Thumbnail] YouTube ID from identifier:', videoId);
      }
      
      // Method 2: Extract from youtube.com/watch?v= URL
      if (!videoId && uri?.includes('youtube.com/watch?v=')) {
        videoId = uri.split('watch?v=')[1]?.split('&')[0]?.split('#')[0];
        if (videoId && videoId.length === 11) {
          console.log('✅ [Thumbnail] YouTube ID from watch URL:', videoId);
        }
      }
      
      // Method 3: Extract from youtu.be/ short URL
      if (!videoId && uri?.includes('youtu.be/')) {
        videoId = uri.split('youtu.be/')[1]?.split('?')[0]?.split('#')[0];
        if (videoId && videoId.length === 11) {
          console.log('✅ [Thumbnail] YouTube ID from short URL:', videoId);
        }
      }
      
      // Method 4: Extract from /v/ or /embed/ URL
      if (!videoId && uri) {
        const vMatch = uri.match(/\/(?:v|embed)\/([a-zA-Z0-9_-]{11})/);
        if (vMatch && vMatch[1]) {
          videoId = vMatch[1];
          console.log('✅ [Thumbnail] YouTube ID from embed URL:', videoId);
        }
      }
      
      if (videoId && videoId.length === 11) {
        // Use maxresdefault for better quality, fallback to hqdefault
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }
    
    // SOUNDCLOUD - Note: Lavalink v3 doesn't provide artwork
    if (sourceName === "soundcloud" || uri?.includes('soundcloud.com')) {
      console.log('ℹ️ [Thumbnail] SoundCloud track - artwork not available via Lavalink v3');
      // Could potentially scrape from SoundCloud page or use their API
      // For now, will use fallback artwork
    }
    
    console.log('⚠️ [Thumbnail] No thumbnail URL could be constructed');
    return null;
  }

  /**
   * Fetch SoundCloud artwork (async helper)
   */
  static async fetchSoundCloudArtwork(trackUri) {
    try {
      const axios = require('axios');
      // This would require SoundCloud API key - for now, return null
      // In production, you'd use SoundCloud's resolve API
      return null;
    } catch (error) {
      console.error('Failed to fetch SoundCloud artwork:', error.message);
      return null;
    }
  }
}

module.exports = MusicPlayerCard;
