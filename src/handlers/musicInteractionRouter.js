const { InteractionType, ComponentType } = require("discord.js");
const MusicPlayerView = require("@helpers/MusicPlayerView");

const interactionTimestamps = new Map();

const playerHistory = new Map();

function addToHistory(guildId, track) {
  if (!playerHistory.has(guildId)) {
    playerHistory.set(guildId, []);
  }
  const history = playerHistory.get(guildId);
  const trackInfo = track.info || track;
  history.unshift({
    title: trackInfo.title,
    author: trackInfo.author,
    length: trackInfo.length,
    uri: trackInfo.uri,
    thumbnail: trackInfo.thumbnail
  });
  
  if (history.length > 50) {
    history.pop();
  }
}

function getHistory(guildId) {
  return playerHistory.get(guildId) || [];
}

module.exports = async (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (interaction.type !== InteractionType.MessageComponent) return;
    if (interaction.componentType !== ComponentType.Button) return;
    
    const customId = interaction.customId;
    
    const musicActions = [
      'music_previous', 'music_pause', 'music_resume', 'music_next', 'music_stop',
      'music_shuffle', 'music_loop', 'music_volup', 'music_voldown', 'music_jump',
      'music_queue_view', 'music_back', 'music_back_to_player', 'music_autoplay',
      'music_settings', 'music_history', 'music_play'
    ];
    
    const isQueuePage = customId.startsWith('queue_page_');
    const isHistoryPage = customId.startsWith('history_page_');
    
    if (!musicActions.includes(customId) && !isQueuePage && !isHistoryPage) return;

    try {
      const { guild, member } = interaction;
      const player = client.musicManager?.getPlayer(guild.id);
      
      const lastInteractionTime = interactionTimestamps.get(guild.id);
      interactionTimestamps.set(guild.id, Date.now());
      
      const requester = member.user.username;

      if (customId === 'music_previous') {
        if (!player || !player.queue.current) {
          return await interaction.reply({ content: '🚫 No music is playing', ephemeral: true });
        }
        
        if (member.voice.channel?.id !== guild.members.me.voice?.channel?.id) {
          return await interaction.reply({ content: '🚫 You must be in the same voice channel', ephemeral: true });
        }
        
        if (player.queue.previous.length > 0) {
          const previousTrack = player.queue.previous.pop();
          player.queue.tracks.unshift(player.queue.current);
          player.queue.current = previousTrack;
          await player.queue.start();
        } else {
          await player.seek(0);
        }
        
        const display = MusicPlayerView.createNowPlayingDisplay(player, `@${requester}`, interaction, lastInteractionTime);
        await interaction.update(display);
      }
      
      else if (customId === 'music_pause') {
        if (!player || !player.playing) {
          return await interaction.reply({ content: '🚫 No music is playing', ephemeral: true });
        }
        
        if (member.voice.channel?.id !== guild.members.me.voice?.channel?.id) {
          return await interaction.reply({ content: '🚫 You must be in the same voice channel', ephemeral: true });
        }
        
        await player.pause(true);
        const display = MusicPlayerView.createNowPlayingDisplay(player, `@${requester}`, interaction, lastInteractionTime);
        await interaction.update(display);
      }
      
      else if (customId === 'music_resume' || customId === 'music_play') {
        if (!player) {
          return await interaction.reply({ content: '🚫 No music is playing', ephemeral: true });
        }
        
        if (member.voice.channel?.id !== guild.members.me.voice?.channel?.id) {
          return await interaction.reply({ content: '🚫 You must be in the same voice channel', ephemeral: true });
        }
        
        await player.pause(false);
        const display = MusicPlayerView.createNowPlayingDisplay(player, `@${requester}`, interaction, lastInteractionTime);
        await interaction.update(display);
      }
      
      else if (customId === 'music_next') {
        if (!player || !player.queue.current) {
          return await interaction.reply({ content: '🚫 No music is playing', ephemeral: true });
        }
        
        if (member.voice.channel?.id !== guild.members.me.voice?.channel?.id) {
          return await interaction.reply({ content: '🚫 You must be in the same voice channel', ephemeral: true });
        }
        
        if (player.queue.current) {
          addToHistory(guild.id, player.queue.current);
        }
        
        await player.queue.next();
        
        if (player.queue.current) {
          const display = MusicPlayerView.createNowPlayingDisplay(player, `@${requester}`, interaction, lastInteractionTime);
          await interaction.update(display);
        } else {
          const display = MusicPlayerView.createEmptyQueueDisplay();
          await interaction.update(display);
        }
      }
      
      else if (customId === 'music_stop') {
        if (!player) {
          return await interaction.reply({ content: '🚫 No music is playing', ephemeral: true });
        }
        
        if (member.voice.channel?.id !== guild.members.me.voice?.channel?.id) {
          return await interaction.reply({ content: '🚫 You must be in the same voice channel', ephemeral: true });
        }
        
        if (player.queue.current) {
          addToHistory(guild.id, player.queue.current);
        }
        
        player.queue.tracks = [];
        await player.disconnect();
        client.musicManager.destroyPlayer(guild.id);
        
        const display = MusicPlayerView.createEmptyQueueDisplay();
        await interaction.update(display);
      }
      
      else if (customId === 'music_shuffle') {
        if (!player || !player.queue.tracks || player.queue.tracks.length === 0) {
          return await interaction.reply({ content: '🚫 Queue is empty', ephemeral: true });
        }
        
        if (member.voice.channel?.id !== guild.members.me.voice?.channel?.id) {
          return await interaction.reply({ content: '🚫 You must be in the same voice channel', ephemeral: true });
        }
        
        const queue = player.queue.tracks;
        for (let i = queue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [queue[i], queue[j]] = [queue[j], queue[i]];
        }
        
        const display = MusicPlayerView.createNowPlayingDisplay(player, `@${requester}`, interaction, lastInteractionTime);
        await interaction.update(display);
      }
      
      else if (customId === 'music_loop') {
        if (!player) {
          return await interaction.reply({ content: '🚫 No music is playing', ephemeral: true });
        }
        
        if (member.voice.channel?.id !== guild.members.me.voice?.channel?.id) {
          return await interaction.reply({ content: '🚫 You must be in the same voice channel', ephemeral: true });
        }
        
        const currentLoop = player.queue.loop || 0;
        const newLoop = (currentLoop + 1) % 3;
        player.queue.setLoop(newLoop);
        
        const display = MusicPlayerView.createNowPlayingDisplay(player, `@${requester}`, interaction, lastInteractionTime);
        await interaction.update(display);
      }
      
      else if (customId === 'music_volup') {
        if (!player) {
          return await interaction.reply({ content: '🚫 No music is playing', ephemeral: true });
        }
        
        if (member.voice.channel?.id !== guild.members.me.voice?.channel?.id) {
          return await interaction.reply({ content: '🚫 You must be in the same voice channel', ephemeral: true });
        }
        
        const currentVol = player.volume || 100;
        const newVol = Math.min(200, currentVol + 10);
        await player.setVolume(newVol);
        
        const display = MusicPlayerView.createNowPlayingDisplay(player, `@${requester}`, interaction, lastInteractionTime);
        await interaction.update(display);
      }
      
      else if (customId === 'music_voldown') {
        if (!player) {
          return await interaction.reply({ content: '🚫 No music is playing', ephemeral: true });
        }
        
        if (member.voice.channel?.id !== guild.members.me.voice?.channel?.id) {
          return await interaction.reply({ content: '🚫 You must be in the same voice channel', ephemeral: true });
        }
        
        const currentVol = player.volume || 100;
        const newVol = Math.max(0, currentVol - 10);
        await player.setVolume(newVol);
        
        const display = MusicPlayerView.createNowPlayingDisplay(player, `@${requester}`, interaction, lastInteractionTime);
        await interaction.update(display);
      }
      
      else if (customId === 'music_queue_view') {
        if (!player || !player.queue.current) {
          return await interaction.reply({ content: '🚫 No music is playing', ephemeral: true });
        }
        
        const display = MusicPlayerView.createQueueDisplay(player, `@${requester}`, 1);
        await interaction.update(display);
      }
      
      else if (customId === 'music_back_to_player' || customId === 'music_back') {
        if (!player || !player.queue.current) {
          const display = MusicPlayerView.createEmptyQueueDisplay();
          await interaction.update(display);
        } else {
          const display = MusicPlayerView.createNowPlayingDisplay(player, `@${requester}`, interaction, lastInteractionTime);
          await interaction.update(display);
        }
      }
      
      else if (isQueuePage) {
        if (!player || !player.queue.current) {
          return await interaction.reply({ content: '🚫 No music is playing', ephemeral: true });
        }
        
        const page = parseInt(customId.split('_')[2]) || 1;
        const display = MusicPlayerView.createQueueDisplay(player, `@${requester}`, page);
        await interaction.update(display);
      }
      
      else if (customId === 'music_history') {
        const history = getHistory(guild.id);
        const display = MusicPlayerView.createHistoryDisplay(history, 1);
        await interaction.update(display);
      }
      
      else if (isHistoryPage) {
        const page = parseInt(customId.split('_')[2]) || 1;
        const history = getHistory(guild.id);
        const display = MusicPlayerView.createHistoryDisplay(history, page);
        await interaction.update(display);
      }
      
      else if (customId === 'music_autoplay') {
        await interaction.reply({ content: 'ℹ️ Autoplay feature coming soon!', ephemeral: true });
      }
      
      else if (customId === 'music_settings') {
        await interaction.reply({ content: '⚙️ Settings panel coming soon!', ephemeral: true });
      }
      
      else if (customId === 'music_jump') {
        await interaction.reply({ content: '⏫ Jump to track feature coming soon!', ephemeral: true });
      }
      
    } catch (error) {
      client.logger.error('Music interaction error:', error.message || error);
      client.logger.error('Error stack:', error.stack || 'No stack trace');
      client.logger.error('Custom ID:', customId);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ 
          content: `❌ An error occurred: ${error.message || 'Unknown error'}`, 
          ephemeral: true 
        }).catch(() => {});
      } else if (interaction.deferred) {
        await interaction.editReply({ 
          content: `❌ An error occurred: ${error.message || 'Unknown error'}`
        }).catch(() => {});
      }
    }
  });
};

module.exports.addToHistory = addToHistory;
module.exports.getHistory = getHistory;
