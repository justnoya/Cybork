const { success, error } = require("../helpers/Logger");
const { initializeDatabase } = require("./initDb");

module.exports = {
  async initializeMongoose() {
    try {
      await initializeDatabase();
      success("PostgreSQL database ready");
    } catch (err) {
      error("PostgreSQL database initialization failed", err);
      throw err;
    }
  },

  schemas: {
    Giveaways: require("./schemas/Giveaways"),
    Guild: require("./schemas/Guild"),
    Member: require("./schemas/Member"),
    ReactionRoles: require("./schemas/ReactionRoles").model,
    ModLog: require("./schemas/ModLog").model,
    TranslateLog: require("./schemas/TranslateLog").model,
    User: require("./schemas/User"),
    Suggestions: require("./schemas/Suggestions").model,
    Party: require("./schemas/Party"),
  },
};
