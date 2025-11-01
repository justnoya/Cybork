const ContainerBuilder = require("@helpers/ContainerBuilder");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "sreset",
  description: "Reset the bot's server-specific settings (nickname) in this server",
  category: "PFP",
  userPermissions: ["ManageGuild"],
  botPermissions: ["ChangeNickname"],
  command: {
    enabled: false,
    usage: "",
  },
  slashCommand: {
    enabled: false,
    options: [],
  },

  async messageRun(message, args) {
    try {
      const oldNickname = message.guild.members.me.nickname;
      
      // Reset nickname to null (uses the bot's global username)
      await message.guild.members.me.setNickname(null);

      return message.safeReply(
        ContainerBuilder.success(
          "Server Settings Reset!",
          `Bot's server-specific settings have been reset in ${message.guild.name}!\n\n${oldNickname ? `**Previous Nickname:** ${oldNickname}\n` : ''}**Current Display Name:** ${message.client.user.username}`,
          0x00FF00
        )
      );
    } catch (error) {
      console.error("Error resetting server settings:", error);
      return message.safeReply(
        ContainerBuilder.error(
          "Failed to Reset Settings",
          `Error: ${error.message}`,
          0xFF0000
        )
      );
    }
  },

  async interactionRun(interaction) {
    try {
      const oldNickname = interaction.guild.members.me.nickname;
      
      // Reset nickname to null (uses the bot's global username)
      await interaction.guild.members.me.setNickname(null);

      return interaction.followUp(
        ContainerBuilder.success(
          "Server Settings Reset!",
          `Bot's server-specific settings have been reset in ${interaction.guild.name}!\n\n${oldNickname ? `**Previous Nickname:** ${oldNickname}\n` : ''}**Current Display Name:** ${interaction.client.user.username}`,
          0x00FF00
        )
      );
    } catch (error) {
      console.error("Error resetting server settings:", error);
      return interaction.followUp(
        ContainerBuilder.error(
          "Failed to Reset Settings",
          `Error: ${error.message}`,
          0xFF0000
        )
      );
    }
  },
};
