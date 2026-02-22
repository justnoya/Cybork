require("dotenv").config();
require("module-alias/register");

// Load configuration from api.json if .env values are not set
const fs = require("fs");
const path = require("path");

const apiJsonPath = path.join(__dirname, "api.json");
if (fs.existsSync(apiJsonPath)) {
  try {
    const apiConfig = JSON.parse(fs.readFileSync(apiJsonPath, "utf8"));
    
    // Only set values from api.json if they're not already in process.env
    Object.keys(apiConfig).forEach((key) => {
      if (!process.env[key]) {
        process.env[key] = apiConfig[key];
      }
    });
  } catch (error) {
    console.error("Error loading api.json:", error.message);
  }
}

// register extenders
require("@helpers/extenders/Message");
require("@helpers/extenders/Guild");
require("@helpers/extenders/GuildChannel");

const { checkForUpdates } = require("@helpers/BotUtils");
const { initializeMongoose } = require("@src/database/mongoose");
const { BotClient } = require("@src/structures");
const { validateConfiguration } = require("@helpers/Validator");

validateConfiguration();

// initialize client
const client = new BotClient();
client.loadCommands("src/commands");
client.loadContexts("src/contexts");
client.loadEvents("src/events");

// find unhandled promise rejections
process.on("unhandledRejection", (err) => client.logger.error(`Unhandled exception`, err));

(async () => {
  // check for updates
  await checkForUpdates();

  // start the dashboard
  if (client.config.DASHBOARD.enabled) {
    client.logger.log("Launching dashboard");
    try {
      const { launch } = require("@root/dashboard/app");

      // let the dashboard initialize the database
      await launch(client);
    } catch (ex) {
      client.logger.error("Failed to launch dashboard", ex);
    }
  } else {
    // initialize the database
    await initializeMongoose();
  }

  // start the client
  await client.login(process.env.BOT_TOKEN);
})();
