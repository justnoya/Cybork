
const ContainerBuilder = require("@helpers/ContainerBuilder");
const { SUPPORT_SERVER, DASHBOARD, DEVELOPER, OWNER_IDS } = require("@root/config");
const os = require("os");
const { GuildModel } = require("@schemas/Guild");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "botinfo",
  description: "Shows bot information and statistics",
  category: "BOT",
  botPermissions: ["EmbedLinks"],
  cooldown: 5,
  command: {
    enabled: true,
    aliases: ["botstats", "bi", "info"],
  },
  slashCommand: {
    enabled: true,
    ephemeral: false,
    options: [],
  },

  async messageRun(message, args) {
    const response = await getBotStats(message.client);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const response = await getBotStats(interaction.client);
    await interaction.followUp(response);
  },
};

async function getBotStats(client) {
  const platform = process.platform.replace(/win32/g, "Windows").replace(/linux/g, "Linux").replace(/darwin/g, "macOS");
  const latency = `${client.ws.ping}ms`;

  // Get developers from database
  let developers = [];
  try {
    const settings = await GuildModel.findOne({ _id: "GLOBAL_SETTINGS" });
    developers = settings?.developers || [];
  } catch (error) {
    client.logger.error("Error fetching developers:", error);
  }

  // Format founder
  const founderId = OWNER_IDS[0] || "1354287041772392478";
  let creatorText = DEVELOPER || "saw";

  // Add additional developers if any
  if (developers.length > 0) {
    const devNames = [];
    for (const devId of developers) {
      try {
        const user = await client.users.fetch(devId);
        devNames.push(user.username);
      } catch (err) {
        // Skip if user can't be fetched
      }
    }
    if (devNames.length > 0) {
      creatorText = `${DEVELOPER || "saw"}, ${devNames.join(", ")}`;
    }
  }

  // Count total commands (both prefix and slash)
  const prefixCommands = client.commands.length || 0;
  const slashCommands = client.slashCommands?.size || 0;
  const totalCommands = prefixCommands + slashCommands;

  const mainText = ContainerBuilder.createTextDisplay(
    `# About ${client.user.username}\n\n` +
    `Managed and Created by **${creatorText}**\n\n` +
    `## Statistics\n` +
    `> **Users:** \`${client.guilds.cache.reduce((size, g) => size + g.memberCount, 0).toLocaleString()}\`\n` +
    `> **Servers:** \`${client.guilds.cache.size}\`\n` +
    `> **Commands:** \`${totalCommands}\` (Prefix: ${prefixCommands} | Slash: ${slashCommands})\n\n` +
    `## System\n` +
    `> **Latency:** \`${latency}\`\n` +
    `> **Language:** \`discord.js\`\n` +
    `> **System:** \`${platform}\`\n\n` +
    `*Powered by Blackbit Studio*`
  );

  // Create buttons for invite, support, and dashboard
  const buttons = [];

  buttons.push({
    type: 2,
    style: 5,
    label: "Invite Bot",
    emoji: "🔗",
    url: client.getInvite()
  });

  if (SUPPORT_SERVER) {
    buttons.push({
      type: 2,
      style: 5,
      label: "Support Server",
      emoji: "💬",
      url: SUPPORT_SERVER
    });
  }

  if (DASHBOARD.enabled) {
    buttons.push({
      type: 2,
      style: 5,
      label: "Dashboard",
      emoji: "🌐",
      url: DASHBOARD.baseURL
    });
  }

  const buttonRow = {
    type: 1,
    components: buttons
  };

  const payload = new ContainerBuilder()
    .addContainer({ 
      accentColor: 0xFFFFFF,
      components: [mainText, buttonRow]
    })
    .build();

  return payload;
}
