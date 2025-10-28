const mongoose = require("mongoose");

const Schema = new mongoose.Schema(
  {
    _id: { type: String, default: "global" },
    noprefix_users: { type: [String], default: [] },
    access_users: { type: [String], default: [] },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

const Model = mongoose.model("botconfig", Schema);

module.exports = {
  getBotConfig: async () => {
    let config = await Model.findById("global");
    if (!config) {
      config = new Model({ _id: "global" });
      await config.save();
    }
    return config;
  },
  
  Model,
};
