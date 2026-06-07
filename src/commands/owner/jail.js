
const { joinVoiceChannel, entersState, VoiceConnectionStatus, createAudioPlayer, createAudioResource, StreamType } = require("@discordjs/voice");
const { PermissionFlagsBits } = require("discord.js");
const { Readable } = require("stream");

// Map to store jailed bot instances per guild
const jailedBots = new Map();

// Create a silent audio stream to keep connection alive
function createSilentAudioStream() {
  const silence = Buffer.from([0xF8, 0xFF, 0xFE]);
  return Readable.from(silence);
}

/**
 * Join user's voice channel and lock the bot there
 * @param {import('discord.js').GuildMember} member - Member who triggered the command
 * @param {import('discord.js').Guild} guild - Guild where command was triggered
 */
async function joinAndLockVC(member, guild) {
  // Check if user is in a voice channel
  if (!member.voice.channel) {
    return "<:error:1424072711671382076> You must be in a voice channel first!";
  }

  const voiceChannel = member.voice.channel;
  const botMember = guild.members.cache.get(guild.client.user.id);

  // Check bot permissions
  if (!voiceChannel.permissionsFor(botMember).has([PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])) {
    return "<:error:1424072711671382076> I don't have permission to join your voice channel!";
  }

  try {
    // Join the voice channel
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: true,
    });

    // Wait for connection to be ready
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

    // Create audio player to keep connection alive
    const player = createAudioPlayer();
    const resource = createAudioResource(createSilentAudioStream(), {
      inputType: StreamType.Arbitrary,
    });

    player.play(resource);
    connection.subscribe(player);

    // Handle disconnections and reconnect automatically
    connection.on('stateChange', async (oldState, newState) => {
      if (newState.status === VoiceConnectionStatus.Disconnected) {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch (error) {
          // Reconnect if still jailed
          if (jailedBots.has(guild.id)) {
            try {
              connection.rejoin({
                channelId: voiceChannel.id,
                guildId: guild.id,
                selfDeaf: false,
                selfMute: true,
              });
            } catch (rejoinError) {
              console.error("Failed to rejoin voice channel:", rejoinError);
            }
          }
        }
      }
    });

    // Handle connection errors
    connection.on('error', (error) => {
      console.error('Voice connection error:', error);
      if (jailedBots.has(guild.id)) {
        try {
          connection.rejoin({
            channelId: voiceChannel.id,
            guildId: guild.id,
            selfDeaf: false,
            selfMute: true,
          });
        } catch (rejoinError) {
          console.error("Failed to rejoin after error:", rejoinError);
        }
      }
    });

    // Lock the bot in this channel
    jailedBots.set(guild.id, {
      guildId: guild.id,
      channelId: voiceChannel.id,
      channelName: voiceChannel.name,
      connection: connection,
      player: player,
    });

    return `<:success:1424072640829722745> **Bot joined and locked in:** ${voiceChannel.name}\n\nI'm now locked in this voice channel with auto-reconnect enabled. Use \`fuckoff\` to unlock.`;
  } catch (error) {
    console.error("Failed to join voice channel:", error);
    return `<:error:1424072711671382076> Failed to join voice channel: ${error.message}`;
  }
}

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "fuck",
  description: "Bot joins your VC and locks there until fuckoff (owner/access only)",
  category: "OWNER",
  botPermissions: ["Connect", "Speak"],
  command: {
    enabled: true,
    usage: "",
    minArgsCount: 0,
  },
  slashCommand: {
    enabled: false,
  },

  async messageRun(message, args) {
    const response = await joinAndLockVC(message.member, message.guild);
    return message.safeReply(response);
  },

  async interactionRun(interaction) {
    const response = await joinAndLockVC(interaction.member, interaction.guild);
    return interaction.followUp(response);
  },
};

module.exports.jailedBots = jailedBots;
