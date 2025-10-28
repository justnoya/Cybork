const { Schema, model } = require("mongoose");

const PartySchema = new Schema(
  {
    partyId: { type: String, required: true, unique: true },
    guildId: { type: String, required: true },
    hostId: { type: String, required: true },
    hostUsername: { type: String, required: true },
    name: { type: String, default: "Listening Party" },
    voiceChannelId: { type: String },
    textChannelId: { type: String },
    members: [
      {
        userId: String,
        username: String,
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    queue: [
      {
        title: String,
        author: String,
        uri: String,
        duration: Number,
        requestedBy: String,
        addedAt: { type: Date, default: Date.now },
      },
    ],
    settings: {
      voteSkipPercentage: { type: Number, default: 50 },
      allowGuestControl: { type: Boolean, default: false },
      maxMembers: { type: Number, default: 0 },
      autoplay: { type: Boolean, default: true },
      announceJoins: { type: Boolean, default: true },
    },
    status: {
      type: String,
      enum: ["active", "paused", "ended"],
      default: "active",
    },
    currentTrack: {
      title: String,
      author: String,
      uri: String,
      duration: Number,
      startedAt: Date,
    },
    votes: {
      skip: [String],
      pause: [String],
    },
    createdAt: { type: Date, default: Date.now },
    endedAt: Date,
  },
  {
    timestamps: true,
  }
);

PartySchema.index({ partyId: 1 });
PartySchema.index({ guildId: 1, status: 1 });
PartySchema.index({ hostId: 1 });

module.exports = model("Party", PartySchema);
