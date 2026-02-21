const mongoose = require("mongoose");
const { log, success, error, warn } = require("../helpers/Logger");

mongoose.set("strictQuery", true);

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 5000;

async function attemptReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    error(`Database recovery failed: Maximum attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
    return;
  }

  reconnectAttempts++;
  const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1);
  warn(`Database connection interrupted: Attempting recovery (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

  try {
    await mongoose.connect(process.env.MONGO_CONNECTION, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    });
    success("Database recovery successful");
    reconnectAttempts = 0;
  } catch (err) {
    error(`Database recovery attempt ${reconnectAttempts} failed`, err);
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      setTimeout(attemptReconnect, delay);
    }
  }
}

module.exports = {
  async initializeMongoose() {
    log(`Establishing connection to Database cluster...`);

    try {
      await mongoose.connect(process.env.MONGO_CONNECTION, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 2,
      });

      success("Database connection established");

      mongoose.connection.on("disconnected", () => {
        warn("Database connection lost. Initiating automatic recovery...");
        attemptReconnect();
      });

      mongoose.connection.on("reconnected", () => {
        success("Database synchronization restored");
        reconnectAttempts = 0;
      });

      mongoose.connection.on("error", (err) => {
        error("Critical database error", err);
        if (mongoose.connection.readyState === 0) {
          attemptReconnect();
        }
      });

      return mongoose.connection;
    } catch (err) {
      error("Database initialization failed. Starting automated recovery sequence...", err);
      attemptReconnect();
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
