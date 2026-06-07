const fs = require("fs");
const path = require("path");

// Polyfill File global for Node 18 (it's only a global in Node 20+)
if (typeof globalThis.File === "undefined") {
  globalThis.File = require("node:buffer").File;
}

require("module-alias/register");
const moduleAlias = require("module-alias");
moduleAlias.addAliases({
  "@root": __dirname,
  "@handlers": path.join(__dirname, "src/handlers"),
  "@helpers": path.join(__dirname, "src/helpers"),
  "@schemas": path.join(__dirname, "src/database/schemas"),
  "@src": path.join(__dirname, "src"),
  "@structures": path.join(__dirname, "src/structures"),
});

require("dotenv").config();

// Polyfill discord.js v14 enums that commands use but don't exist in v13
const _djs = require("discord.js");
if (!_djs.ApplicationCommandOptionType) {
  _djs.ApplicationCommandOptionType = {
    Subcommand: 1, SubcommandGroup: 2, String: 3, Integer: 4,
    Boolean: 5, User: 6, Channel: 7, Role: 8, Mentionable: 9,
    Number: 10, Attachment: 11,
  };
}
if (!_djs.ChannelType) {
  _djs.ChannelType = {
    GuildText: 0, DM: 1, GuildVoice: 2, GroupDM: 3,
    GuildCategory: 4, GuildAnnouncement: 5, GuildNews: 5,
    GuildNewsThread: 10, GuildPublicThread: 11, GuildPrivateThread: 12,
    GuildStageVoice: 13, GuildDirectory: 14, GuildForum: 15,
  };
}
if (!_djs.PermissionFlagsBits) {
  _djs.PermissionFlagsBits = {
    CreateInstantInvite: 1n, KickMembers: 2n, BanMembers: 4n,
    Administrator: 8n, ManageChannels: 16n, ManageGuild: 32n,
    AddReactions: 64n, ViewAuditLog: 128n, PrioritySpeaker: 256n,
    Stream: 512n, ViewChannel: 1024n, SendMessages: 2048n,
    SendTTSMessages: 4096n, ManageMessages: 8192n, EmbedLinks: 16384n,
    AttachFiles: 32768n, ReadMessageHistory: 65536n, MentionEveryone: 131072n,
    UseExternalEmojis: 262144n, ViewGuildInsights: 524288n, Connect: 1048576n,
    Speak: 2097152n, MuteMembers: 4194304n, DeafenMembers: 8388608n,
    MoveMembers: 16777216n, UseVAD: 33554432n, ChangeNickname: 67108864n,
    ManageNicknames: 134217728n, ManageRoles: 268435456n,
    ManageWebhooks: 536870912n, ManageEmojisAndStickers: 1073741824n,
    UseApplicationCommands: 2147483648n, RequestToSpeak: 4294967296n,
    ManageEvents: 8589934592n, ManageThreads: 17179869184n,
    CreatePublicThreads: 34359738368n, CreatePrivateThreads: 68719476736n,
    UseExternalStickers: 137438953472n, SendMessagesInThreads: 274877906944n,
    UseEmbeddedActivities: 549755813888n, ModerateMembers: 1099511627776n,
  };
}

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
require("./src/helpers/extenders/Message");
require("./src/helpers/extenders/Guild");
require("./src/helpers/extenders/GuildChannel");

const { checkForUpdates } = require("./src/helpers/BotUtils");
const { initializeMongoose } = require("./src/database/mongoose");
const { BotClient } = require("./src/structures");
const { validateConfiguration } = require("./src/helpers/Validator");

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
