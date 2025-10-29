const { createCanvas, loadImage, registerFont } = require('canvas');
const axios = require('axios');

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
          const response = await axios.get(thumbnail, { 
            responseType: 'arraybuffer',
            timeout: 4000,
            headers: { 'User-Agent': 'Mozilla/5.0' },
            maxRedirects: 3,
            validateStatus: (status) => status === 200
          });
          const img = await loadImage(Buffer.from(response.data));
          
          ctx.save();
          this.roundRect(ctx, artX, artY, artSize, artSize, 20);
          ctx.clip();
          ctx.drawImage(img, artX, artY, artSize, artSize);
          ctx.restore();
        } catch (err) {
          console.log(`Thumbnail load failed, using fallback: ${err.message}`);
          this.drawFallbackArtwork(ctx, artX, artY, artSize);
        }
      } else {
        this.drawFallbackArtwork(ctx, artX, artY, artSize);
      }
      
      // Reset shadow
      ctx.shadowBlur = 0;
      
      // Info section
      const infoX = artX + artSize + 40;
      const infoWidth = width - infoX - 40;
      let currentY = 80;
      
      // "Now Playing" label
      ctx.fillStyle = '#8B5CF6';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('NOW PLAYING', infoX, currentY);
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
      const statusText = isPaused ? '⏸ Paused' : '▶ Playing';
      const statusColor = isPaused ? '#F59E0B' : '#10B981';
      this.drawBadge(ctx, statusText, badgeX, currentY, statusColor);
      badgeX += ctx.measureText(statusText).width + 35;
      
      // Loop badge
      if (loopMode === 1) {
        this.drawBadge(ctx, '🔂 Repeat One', badgeX, currentY, '#8B5CF6');
        badgeX += ctx.measureText('🔂 Repeat One').width + 35;
      } else if (loopMode === 2) {
        this.drawBadge(ctx, '🔁 Repeat All', badgeX, currentY, '#8B5CF6');
        badgeX += ctx.measureText('🔁 Repeat All').width + 35;
      }
      
      // Volume badge
      const volumeEmoji = volume === 0 ? '🔇' : volume < 33 ? '🔉' : '🔊';
      this.drawBadge(ctx, `${volumeEmoji} ${volume}%`, badgeX, currentY, '#6366F1');
      
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
    
    if (trackInfo.artworkUrl || track.artworkUrl) {
      return trackInfo.artworkUrl || track.artworkUrl;
    }
    
    if (trackInfo.thumbnail || track.thumbnail) {
      return trackInfo.thumbnail || track.thumbnail;
    }
    
    if (trackInfo.sourceName === "youtube" || track.sourceName === "youtube") {
      const identifier = trackInfo.identifier || track.identifier;
      if (identifier) {
        return `https://img.youtube.com/vi/${identifier}/maxresdefault.jpg`;
      }
    }
    
    return null;
  }
}

module.exports = MusicPlayerCard;
