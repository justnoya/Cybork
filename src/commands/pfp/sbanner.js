const ContainerBuilder = require("@helpers/ContainerBuilder");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "sbanner",
  description: "Set the bot's global banner (affects all servers, requires bot Nitro)",
  category: "PFP",
  userPermissions: ["ManageGuild"],
  botPermissions: ["ManageGuild"],
  command: {
    enabled: false,
    usage: "<image_url>",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: false,
    options: [
      {
        name: "image_url",
        description: "Image URL or attach an image",
        type: 3,
        required: true,
      },
    ],
  },

  async messageRun(message, args) {
    let imageUrl;

    // Check if it's a URL
    if (args[0] && args[0].startsWith("http")) {
      imageUrl = args[0];
    }
    // Check for attachments
    else if (message.attachments.size > 0) {
      imageUrl = message.attachments.first().url;
    } 
    else {
      return message.safeReply(
        ContainerBuilder.error(
          "Invalid Input",
          "Please provide an image URL or attach an image!",
          0xFF0000
        )
      );
    }

    try {
      // Note: Discord bots can only have ONE global banner, not per-server banners
      // This changes the bot's banner globally and requires bot Nitro
      await message.client.user.setBanner(imageUrl);

      return message.safeReply(
        ContainerBuilder.success(
          "Global Bot Banner Updated!",
          `Bot's banner has been updated globally!\n\n⚠️ **Note:** Discord bots cannot have per-server banners. This change affects the bot everywhere.`,
          0x00FF00,
          [
            {
              label: "View Profile",
              url: `https://discord.com/users/${message.client.user.id}`,
              style: "Link"
            }
          ]
        )
      );
    } catch (error) {
      console.error("Error setting bot banner:", error);
      return message.safeReply(
        ContainerBuilder.error(
          "Failed to Update Banner",
          `Error: ${error.message}\n\n**Note:** Your bot needs Discord Nitro to set a banner.`,
          0xFF0000
        )
      );
    }
  },

  async interactionRun(interaction) {
    const imageUrl = interaction.options.getString("image_url");

    try {
      // Note: Discord bots can only have ONE global banner, not per-server banners
      // This changes the bot's banner globally and requires bot Nitro
      await interaction.client.user.setBanner(imageUrl);

      return interaction.followUp(
        ContainerBuilder.success(
          "Global Bot Banner Updated!",
          `Bot's banner has been updated globally!\n\n⚠️ **Note:** Discord bots cannot have per-server banners. This change affects the bot everywhere.`,
          0x00FF00,
          [
            {
              label: "View Profile",
              url: `https://discord.com/users/${interaction.client.user.id}`,
              style: "Link"
            }
          ]
        )
      );
    } catch (error) {
      console.error("Error setting bot banner:", error);
      return interaction.followUp(
        ContainerBuilder.error(
          "Failed to Update Banner",
          `Error: ${error.message}\n\n**Note:** Your bot needs Discord Nitro to set a banner.`,
          0xFF0000
        )
      );
    }
  },
};
