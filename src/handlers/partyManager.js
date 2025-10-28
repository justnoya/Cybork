const { Collection } = require("discord.js");
const { createAudioPlayer, joinVoiceChannel, VoiceConnectionStatus, entersState } = require("@discordjs/voice");
const crypto = require("crypto");

class PartyManager {
  constructor(client) {
    this.client = client;
    this.activePlayers = new Collection();
    this.partyConnections = new Collection();
    this.activeVotes = new Collection();
    
    client.logger.log("Party Manager initialized");
  }

  generatePartyId() {
    return crypto.randomBytes(6).toString("hex");
  }

  async createParty(guild, host, name, options = {}) {
    const partyId = this.generatePartyId();
    
    const partyData = {
      partyId,
      guildId: guild.id,
      hostId: host.id,
      hostUsername: host.username,
      name: name || "Listening Party",
      members: [
        {
          userId: host.id,
          username: host.username,
          joinedAt: new Date(),
        },
      ],
      settings: {
        voteSkipPercentage: options.voteSkipPercentage || 50,
        allowGuestControl: options.allowGuestControl || false,
        maxMembers: options.maxMembers || 0,
        autoplay: options.autoplay !== false,
        announceJoins: options.announceJoins !== false,
      },
      status: "active",
      queue: [],
      votes: { skip: [], pause: [] },
    };

    const party = await this.client.database.Party.create(partyData);
    
    const player = createAudioPlayer();
    this.activePlayers.set(partyId, player);
    this.partyConnections.set(partyId, new Collection());
    
    this.client.partyMusicHandler.setupPlayerEvents(partyId, player);

    this.client.logger.log(`Party created: ${partyId} by ${host.username} in ${guild.name}`);
    
    return party;
  }

  async getParty(partyId) {
    return await this.client.database.Party.findOne({ partyId, status: { $ne: "ended" } });
  }

  async getActivePartiesByGuild(guildId) {
    return await this.client.database.Party.find({ guildId, status: { $ne: "ended" } });
  }

  async joinParty(partyId, member, voiceChannel) {
    const party = await this.getParty(partyId);
    if (!party) return { success: false, message: "Party not found or has ended" };

    if (party.settings.maxMembers > 0 && party.members.length >= party.settings.maxMembers) {
      return { success: false, message: "Party is full" };
    }

    const alreadyIn = party.members.some((m) => m.userId === member.id);
    if (alreadyIn) {
      return { success: false, message: "You're already in this party" };
    }

    party.members.push({
      userId: member.id,
      username: member.username,
      joinedAt: new Date(),
    });

    await party.save();

    if (voiceChannel) {
      await this.connectToVoice(partyId, voiceChannel);
    }

    this.client.logger.log(`${member.username} joined party ${partyId}`);

    return { success: true, party };
  }

  async leaveParty(partyId, userId) {
    const party = await this.getParty(partyId);
    if (!party) return { success: false, message: "Party not found" };

    party.members = party.members.filter((m) => m.userId !== userId);

    if (party.members.length === 0) {
      return await this.endParty(partyId);
    }

    if (party.hostId === userId && party.members.length > 0) {
      party.hostId = party.members[0].userId;
      party.hostUsername = party.members[0].username;
    }

    await party.save();
    
    this.clearVotes(partyId, userId);

    this.client.logger.log(`User ${userId} left party ${partyId}`);

    return { success: true, party };
  }

  async connectToVoice(partyId, voiceChannel) {
    const party = await this.getParty(partyId);
    if (!party) return null;

    const player = this.activePlayers.get(partyId);
    if (!player) return null;

    const connectionKey = `${partyId}-${voiceChannel.id}`;
    let existingConnection = this.partyConnections.get(partyId)?.get(voiceChannel.id);
    
    if (existingConnection) return existingConnection;

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch {
          connection.destroy();
          this.partyConnections.get(partyId)?.delete(voiceChannel.id);
        }
      });

      connection.subscribe(player);
      
      if (!this.partyConnections.has(partyId)) {
        this.partyConnections.set(partyId, new Collection());
      }
      this.partyConnections.get(partyId).set(voiceChannel.id, connection);

      party.voiceChannelId = voiceChannel.id;
      await party.save();

      this.client.logger.log(`Party ${partyId} connected to voice channel ${voiceChannel.id}`);

      return connection;
    } catch (error) {
      this.client.logger.error(`Failed to connect party ${partyId} to voice:`, error);
      return null;
    }
  }

  getPlayer(partyId) {
    return this.activePlayers.get(partyId);
  }

  async voteSkip(partyId, userId) {
    const party = await this.getParty(partyId);
    if (!party) return { success: false, message: "Party not found" };

    if (!party.votes.skip.includes(userId)) {
      party.votes.skip.push(userId);
      await party.save();
    }

    const votePercentage = (party.votes.skip.length / party.members.length) * 100;
    const required = party.settings.voteSkipPercentage;

    if (votePercentage >= required) {
      party.votes.skip = [];
      await party.save();
      return { success: true, skip: true, votes: party.votes.skip.length, needed: Math.ceil((required / 100) * party.members.length) };
    }

    return { success: true, skip: false, votes: party.votes.skip.length, needed: Math.ceil((required / 100) * party.members.length) };
  }

  clearVotes(partyId, userId = null) {
    if (!this.activeVotes.has(partyId)) return;
    
    if (userId) {
      const votes = this.activeVotes.get(partyId);
      if (votes.skip) votes.skip = votes.skip.filter((id) => id !== userId);
      if (votes.pause) votes.pause = votes.pause.filter((id) => id !== userId);
    } else {
      this.activeVotes.delete(partyId);
    }
  }

  async updatePartySettings(partyId, settings) {
    const party = await this.getParty(partyId);
    if (!party) return null;

    party.settings = { ...party.settings, ...settings };
    await party.save();

    return party;
  }

  async addToQueue(partyId, track, requestedBy) {
    const party = await this.getParty(partyId);
    if (!party) return null;

    const trackInfo = track.info || track;
    
    party.queue.push({
      title: trackInfo.title,
      author: trackInfo.author,
      uri: trackInfo.uri,
      duration: trackInfo.length,
      requestedBy,
      addedAt: new Date(),
    });

    await party.save();
    return party;
  }

  async endParty(partyId) {
    const party = await this.getParty(partyId);
    if (!party) return { success: false, message: "Party not found" };

    party.status = "ended";
    party.endedAt = new Date();
    await party.save();

    const player = this.activePlayers.get(partyId);
    if (player) {
      player.stop();
      this.activePlayers.delete(partyId);
    }

    const connections = this.partyConnections.get(partyId);
    if (connections) {
      connections.forEach((connection) => connection.destroy());
      this.partyConnections.delete(partyId);
    }

    this.activeVotes.delete(partyId);

    this.client.logger.log(`Party ${partyId} ended`);

    return { success: true, party };
  }

  async cleanup() {
    const activeParties = await this.client.database.Party.find({ status: { $ne: "ended" } });
    
    for (const party of activeParties) {
      if (party.members.length === 0 || Date.now() - party.createdAt.getTime() > 24 * 60 * 60 * 1000) {
        await this.endParty(party.partyId);
      }
    }
  }
}

module.exports = PartyManager;
