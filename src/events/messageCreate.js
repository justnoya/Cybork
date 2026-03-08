const { PREFIX_COMMANDS } = require("@root/config");
const { getSettings } = require("@schemas/Guild");
const commandHandler = require("@handlers/command");

/**
 * @param {import('@src/structures').BotClient} client
 * @param {import('discord.js').Message} message
 */
module.exports = async (client, message) => {
  // Ignore bot messages and DMs
  if (message.author.bot || !message.guild) return;

  // Check if prefix commands are enabled
  if (!PREFIX_COMMANDS.ENABLED) return;

  // Get guild settings
  const settings = await getSettings(message.guild);
  const prefix = settings.prefix;

  // Check if message starts with prefix
  if (!message.content.startsWith(prefix)) return;

  // Get the command
  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const invoke = args.shift().toLowerCase();

  const cmd = client.getCommand(invoke);
  if (!cmd) return;

  try {
    // Handle the prefix command
    await commandHandler.handlePrefixCommand(message, cmd, settings);
  } catch (ex) {
    client.logger.error(`messageCreate handler`, ex);
    message.safeReply("An error occurred while processing your command").catch(() => {});
  }
};
