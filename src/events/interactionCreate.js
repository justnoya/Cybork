const { ChannelType } = require("discord.js");
const { getSettings } = require("@schemas/Guild");
const commandHandler = require("@handlers/command");

/**
 * @param {import('@src/structures').BotClient} client
 * @param {import('discord.js').Interaction} interaction
 */
module.exports = async (client, interaction) => {
  // Handle Slash Commands
  if (interaction.isChatInputCommand()) {
    return handleSlashCommand(client, interaction);
  }

  // Handle Context Menu Commands (User and Message)
  if (interaction.isContextMenuCommand()) {
    return handleContextMenu(client, interaction);
  }

  // Handle Button Interactions
  if (interaction.isButton()) {
    if (client.interactionRouter) {
      await client.interactionRouter.handleButton(interaction);
    }
    return;
  }

  // Handle Select Menu Interactions
  if (interaction.isStringSelectMenu() || interaction.isRoleSelectMenu() || 
      interaction.isUserSelectMenu() || interaction.isMentionableSelectMenu() || 
      interaction.isChannelSelectMenu()) {
    if (client.interactionRouter) {
      await client.interactionRouter.handleSelectMenu(interaction);
    }
    return;
  }

  // Handle Modal Submissions
  if (interaction.isModalSubmit()) {
    if (client.interactionRouter) {
      await client.interactionRouter.handleModal(interaction);
    }
    return;
  }
};

/**
 * Handle slash command interactions
 * @param {import('@src/structures').BotClient} client
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function handleSlashCommand(client, interaction) {
  const cmd = client.slashCommands.get(interaction.commandName);

  if (!cmd) {
    return interaction.reply({
      content: "This command no longer exists",
      ephemeral: true,
    }).catch(() => {});
  }

  // Get guild settings
  const settings = interaction.guild ? await getSettings(interaction.guild) : null;

  const data = {
    settings,
  };

  try {
    await commandHandler.handleSlashCommand(interaction);
  } catch (ex) {
    client.logger.error(`interactionCreate [Slash Command]`, ex);
    
    const errorMessage = "An error occurred while running this command";
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true }).catch(() => {});
    }
  }
}

/**
 * Handle context menu interactions
 * @param {import('@src/structures').BotClient} client
 * @param {import('discord.js').ContextMenuCommandInteraction} interaction
 */
async function handleContextMenu(client, interaction) {
  const ctx = client.contextMenus.get(interaction.commandName);

  if (!ctx) {
    return interaction.reply({
      content: "This context menu command no longer exists",
      ephemeral: true,
    }).catch(() => {});
  }

  try {
    await ctx.run(interaction);
  } catch (ex) {
    client.logger.error(`interactionCreate [Context Menu]`, ex);

    const errorMessage = "An error occurred while running this command";
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true }).catch(() => {});
    }
  }
}
