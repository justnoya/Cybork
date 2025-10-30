const MusicPlayerView = require("@helpers/MusicPlayerView");

/**
 * @param {import('discord.js').ButtonInteraction} interaction
 */
module.exports = async (interaction) => {
  await interaction.deferUpdate().catch(() => {});
  
  const { client, guildId, member } = interaction;
  const player = client.musicManager.getPlayer(guildId);
  
  if (!player) {
    return interaction.followUp({ 
      content: "🚫 No music player found!", 
      ephemeral: true 
    });
  }

  const customId = interaction.customId;
  
  try {
    switch(customId) {
      case 'music_previous':
        // Riffy doesn't support previous track history by default
        // Seek to beginning of current track instead
        await player.seek(0);
        break;
        
      case 'music_pause':
        await player.pause(true);
        break;
        
      case 'music_resume':
      case 'music_play':
        await player.pause(false);
        break;
        
      case 'music_next':
        if (player.queue.size === 0) {
          return interaction.followUp({ 
            content: "🚫 No tracks in queue!", 
            ephemeral: true 
          });
        }
        await player.stop();
        break;
        
      case 'music_stop':
        player.queue.clear();
        await player.destroy();
        return interaction.followUp({ 
          content: "⏹️ Stopped the music and cleared the queue!", 
          ephemeral: true 
        });
        
      case 'music_shuffle':
        if (player.queue.size < 2) {
          return interaction.followUp({ 
            content: "🚫 Not enough tracks to shuffle!", 
            ephemeral: true 
          });
        }
        player.queue.shuffle();
        break;
        
      case 'music_loop':
        const loopMode = player.loop;
        if (loopMode === 'none' || !loopMode) {
          player.setLoop('queue'); // Loop queue
        } else if (loopMode === 'queue') {
          player.setLoop('track'); // Loop track
        } else {
          player.setLoop('none'); // No loop
        }
        break;
        
      case 'music_volume_up':
        const newVolumeUp = Math.min(200, player.volume + 10);
        await player.setVolume(newVolumeUp);
        return interaction.followUp({ 
          content: `🔊 Volume set to ${newVolumeUp}%`, 
          ephemeral: true 
        });
        
      case 'music_volume_down':
        const newVolumeDown = Math.max(0, player.volume - 10);
        await player.setVolume(newVolumeDown);
        return interaction.followUp({ 
          content: `🔉 Volume set to ${newVolumeDown}%`, 
          ephemeral: true 
        });
        
      case 'music_repeat':
        const currentLoop = player.loop;
        const nextLoop = (currentLoop === 'track' || currentLoop === 1) ? 'none' : 'track';
        player.setLoop(nextLoop);
        const loopText = nextLoop === 'track' ? "🔁 Repeating current track" : "➡️ Repeat disabled";
        return interaction.followUp({ 
          content: loopText, 
          ephemeral: true 
        });
        
      case 'music_boost':
        const boostVolume = Math.min(200, player.volume + 20);
        await player.setVolume(boostVolume);
        return interaction.followUp({ 
          content: `🔊 Bass boost! Volume set to ${boostVolume}%`, 
          ephemeral: true 
        });
        
      case 'music_queue':
        const requester = member?.user?.username ? `@${member.user.username}` : "@User";
        const queueDisplay = MusicPlayerView.createQueueDisplay(player, requester, 1);
        return interaction.editReply(queueDisplay);
        
      case 'music_back':
        const track = player.queue.current;
        const requesterBack = track?.requester ? `@${track.requester}` : (member?.user?.username ? `@${member.user.username}` : "@User");
        const npDisplay = MusicPlayerView.createNowPlayingDisplay(player, requesterBack, interaction);
        return interaction.editReply(npDisplay);
        
      default:
        if (customId.startsWith('queue_page_')) {
          const page = parseInt(customId.replace('queue_page_', ''));
          const requesterPage = member?.user?.username ? `@${member.user.username}` : "@User";
          const pageDisplay = MusicPlayerView.createQueueDisplay(player, requesterPage, page);
          return interaction.editReply(pageDisplay);
        }
        return;
    }
    
    if (player.queue.current) {
      const track = player.queue.current;
      const requester = track?.requester ? `@${track.requester}` : (member?.user?.username ? `@${member.user.username}` : "@User");
      const updatedDisplay = MusicPlayerView.createNowPlayingDisplay(player, requester, interaction);
      await interaction.editReply(updatedDisplay);
    }
  } catch (error) {
    console.error("Music control error:", error);
    interaction.followUp({ 
      content: `<:error:1424072711671382076> Error: ${error.message}`, 
      ephemeral: true 
    }).catch(() => {});
  }
};
