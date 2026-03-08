const { SUPPORT_SERVER, DASHBOARD } = require("@root/config");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const ContainerBuilder = require("@helpers/ContainerBuilder");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "invite",
  description: "Get bot invitation link and support server",
  category: "BOT",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    aliases: ["inv", "botinvite", "invitebot", "add"],
  },
  slashCommand: {
    enabled: true,
    ephemeral: false,
    options: [],
  },

  async messageRun(message, args) {
    const response = getInviteMessage(message.client);
    await message.channel.send(response);
  },

  async interactionRun(interaction) {
    const response = getInviteMessage(interaction.client);
    await interaction.followUp(response);
  },
};

function getInviteMessage(client) {
  const payload = ContainerBuilder.quickMessage(
    `📨 Invite ${client.user.username}`,
    "Click the buttons below to invite me to your server or join our community!",
    [],
    0xFFFFFF
  );

  const buttons = [];
  
  buttons.push(
    new ButtonBuilder()
      .setLabel("Invite Bot")
      .setURL(client.getInvite())
      .setStyle(ButtonStyle.Link)
  );

  if (SUPPORT_SERVER) {
    buttons.push(
      new ButtonBuilder()
        .setLabel("Support Server")
        .setURL(SUPPORT_SERVER)
        .setStyle(ButtonStyle.Link)
    );
  }

  if (DASHBOARD.enabled) {
    buttons.push(
      new ButtonBuilder()
        .setLabel("Dashboard")
        .setURL(DASHBOARD.baseURL)
        .setStyle(ButtonStyle.Link)
    );
  }

  if (buttons.length > 0) {
    const row = new ActionRowBuilder().addComponents(...buttons);
    payload.components.push(row.toJSON());
  }

  return payload;
}
