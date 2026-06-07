
const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const { GuildModel } = require("@schemas/Guild");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "developer",
  description: "Manage bot developers",
  category: "OWNER",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    aliases: ["dev", "devmode"],
    usage: "<add|remove|list> [user]",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: false,
    options: [
      {
        name: "add",
        description: "Add a developer",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "user",
            description: "The user to add as developer",
            type: ApplicationCommandOptionType.User,
            required: true,
          },
        ],
      },
      {
        name: "remove",
        description: "Remove a developer",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "user",
            description: "The user to remove from developers",
            type: ApplicationCommandOptionType.User,
            required: true,
          },
        ],
      },
      {
        name: "list",
        description: "List all developers",
        type: ApplicationCommandOptionType.Subcommand,
      },
    ],
  },

  async messageRun(message, args) {
    const action = args[0].toLowerCase();
    
    if (action === "list") {
      return await listDevelopers(message);
    }
    
    if (action === "add") {
      const target = await message.guild.resolveMember(args[1]);
      if (!target) return message.safeReply("Please provide a valid user.");
      return await addDeveloper(message, target.user);
    }
    
    if (action === "remove") {
      const target = await message.guild.resolveMember(args[1]);
      if (!target) return message.safeReply("Please provide a valid user.");
      return await removeDeveloper(message, target.user);
    }
    
    await message.safeReply("Invalid action. Use `add`, `remove`, or `list`.");
  },

  async interactionRun(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "list") {
      return await listDevelopers(interaction);
    }

    if (sub === "add") {
      const user = interaction.options.getUser("user");
      return await addDeveloper(interaction, user);
    }

    if (sub === "remove") {
      const user = interaction.options.getUser("user");
      return await removeDeveloper(interaction, user);
    }
  },
};

async function addDeveloper({ client, guild }, user) {
  try {
    let settings = await GuildModel.findOne({ _id: "GLOBAL_SETTINGS" });
    
    if (!settings) {
      settings = new GuildModel({
        _id: "GLOBAL_SETTINGS",
        developers: [],
      });
    }
    
    if (!settings.developers) {
      settings.developers = [];
    }
    
    if (settings.developers.includes(user.id)) {
      return { content: "This user is already a developer!" };
    }
    
    settings.developers.push(user.id);
    await settings.save();
    
    const embed = new EmbedBuilder()
      .setColor("Green")
      .setDescription(`<:success:1424072640829722745> Successfully added **${user.tag}** as a developer!`)
      .setTimestamp();
    
    return { embeds: [embed] };
  } catch (error) {
    client.logger.error("Error adding developer:", error);
    return { content: "An error occurred while adding the developer." };
  }
}

async function removeDeveloper({ client }, user) {
  try {
    const settings = await GuildModel.findOne({ _id: "GLOBAL_SETTINGS" });
    
    if (!settings || !settings.developers || settings.developers.length === 0) {
      return { content: "There are no developers to remove!" };
    }
    
    if (!settings.developers.includes(user.id)) {
      return { content: "This user is not a developer!" };
    }
    
    settings.developers = settings.developers.filter(id => id !== user.id);
    await settings.save();
    
    const embed = new EmbedBuilder()
      .setColor("Orange")
      .setDescription(`<:success:1424072640829722745> Successfully removed **${user.tag}** from developers!`)
      .setTimestamp();
    
    return { embeds: [embed] };
  } catch (error) {
    client.logger.error("Error removing developer:", error);
    return { content: "An error occurred while removing the developer." };
  }
}

async function listDevelopers({ client }) {
  try {
    const settings = await GuildModel.findOne({ _id: "GLOBAL_SETTINGS" });
    const developers = settings?.developers || [];
    
    const founderId = "1354287041772392478";
    let devList = `👑 **Founder:** <@${founderId}>\n`;
    
    if (developers.length > 0) {
      devList += `\n💻 **Developers:**\n`;
      for (let i = 0; i < developers.length; i++) {
        devList += `${i + 1}. <@${developers[i]}>\n`;
      }
    } else {
      devList += `\n💻 **Developers:** None`;
    }
    
    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle("Bot Developers")
      .setDescription(devList)
      .setTimestamp();
    
    return { embeds: [embed] };
  } catch (error) {
    client.logger.error("Error fetching developers:", error);
    return { content: "An error occurred while fetching developers." };
  }
}
