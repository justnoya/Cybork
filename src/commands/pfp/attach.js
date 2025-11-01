const ContainerBuilder = require("@helpers/ContainerBuilder");
const axios = require("axios");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "attach",
  description: "Convert an image/attachment to a Discord CDN URL",
  category: "PFP",
  botPermissions: ["AttachFiles"],
  command: {
    enabled: false,
    usage: "<attach image or provide URL>",
    minArgsCount: 0,
  },
  slashCommand: {
    enabled: false,
    options: [
      {
        name: "url",
        description: "Image URL (or attach an image)",
        type: 3,
        required: false,
      },
    ],
  },

  async messageRun(message, args) {
    let imageUrl;

    // Check for attachments first
    if (message.attachments.size > 0) {
      imageUrl = message.attachments.first().url;
    }
    // Check if URL is provided
    else if (args[0] && args[0].startsWith("http")) {
      imageUrl = args[0];
    }
    else {
      return message.safeReply(
        ContainerBuilder.error(
          "No Image Provided",
          "Please attach an image or provide an image URL!",
          0xFF0000
        )
      );
    }

    try {
      // Download the image
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');
      
      // Create a temporary message with the image to get Discord CDN URL
      const tempMsg = await message.channel.send({
        files: [{
          attachment: buffer,
          name: 'image.png'
        }]
      });

      const discordUrl = tempMsg.attachments.first().url;

      // Delete the temporary message
      await tempMsg.delete().catch(() => {});

      return message.safeReply(
        ContainerBuilder.success(
          "Image Converted!",
          `**Discord CDN URL:**\n\`${discordUrl}\`\n\nYou can now use this URL for bot customization!`,
          0x00FF00,
          [
            {
              label: "Copy URL",
              url: discordUrl,
              style: "Link"
            }
          ]
        )
      );
    } catch (error) {
      console.error("Error converting image:", error);
      return message.safeReply(
        ContainerBuilder.error(
          "Conversion Failed",
          `Error: ${error.message}`,
          0xFF0000
        )
      );
    }
  },

  async interactionRun(interaction) {
    const url = interaction.options.getString("url");

    if (!url) {
      return interaction.followUp(
        ContainerBuilder.error(
          "No URL Provided",
          "Please provide an image URL!",
          0xFF0000
        )
      );
    }

    try {
      // Download the image
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');
      
      // Create a temporary message with the image to get Discord CDN URL
      const tempMsg = await interaction.channel.send({
        files: [{
          attachment: buffer,
          name: 'image.png'
        }]
      });

      const discordUrl = tempMsg.attachments.first().url;

      // Delete the temporary message
      await tempMsg.delete().catch(() => {});

      return interaction.followUp(
        ContainerBuilder.success(
          "Image Converted!",
          `**Discord CDN URL:**\n\`${discordUrl}\`\n\nYou can now use this URL for bot customization!`,
          0x00FF00,
          [
            {
              label: "Copy URL",
              url: discordUrl,
              style: "Link"
            }
          ]
        )
      );
    } catch (error) {
      console.error("Error converting image:", error);
      return interaction.followUp(
        ContainerBuilder.error(
          "Conversion Failed",
          `Error: ${error.message}`,
          0xFF0000
        )
      );
    }
  },
};
