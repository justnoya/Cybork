const { 
  ButtonBuilder, 
  ActionRowBuilder, 
  ButtonStyle, 
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} = require("discord.js");
const ContainerBuilder = require("@helpers/ContainerBuilder");

const IDLE_TIMEOUT = 60; // in seconds
const MAX_PER_PAGE = 10; // max number of servers per page

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "listservers",
  description: "Lists all/matching servers with detailed information",
  category: "OWNER",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    aliases: ["listserver", "findserver", "findservers", "servers"],
    usage: "[match]",
  },
  slashCommand: {
    enabled: false,
  },

  async messageRun(message, args) {
    const { client, channel, member } = message;

    const matched = [];
    const match = args.join(" ") || null;
    
    if (match) {
      // match by id
      if (client.guilds.cache.has(match)) {
        matched.push(client.guilds.cache.get(match));
      }

      // match by name
      client.guilds.cache
        .filter((g) => g.name.toLowerCase().includes(match.toLowerCase()))
        .forEach((g) => matched.push(g));
    }

    const servers = match ? matched : Array.from(client.guilds.cache.values());
    const total = servers.length;
    
    if (total === 0) {
      const response = ContainerBuilder.warning(
        "No Servers Found",
        match ? `No servers found matching: **${match}**` : "The bot is not in any servers.",
        0xFFA500
      );
      return message.channel.send(response);
    }

    const maxPerPage = MAX_PER_PAGE;
    const totalPages = Math.ceil(total / maxPerPage);
    let currentPage = 1;
    let selectedServerId = null;

    // Build server list container
    const buildListContainer = () => {
      const start = (currentPage - 1) * maxPerPage;
      const end = Math.min(start + maxPerPage, total);

      const fields = [];
      for (let i = start; i < end; i++) {
        const server = servers[i];
        const owner = server.members.cache.get(server.ownerId) || { user: { tag: "Unknown" } };
        fields.push({
          name: `${i + 1}. ${server.name}`,
          value: `**ID:** \`${server.id}\`\n**Owner:** ${owner.user.tag}\n**Members:** ${server.memberCount}`,
          inline: true,
        });
      }

      return ContainerBuilder.quickMessage(
        `📊 Server List ${match ? `(Search: ${match})` : ''}`,
        `**Total ${match ? 'Matched' : 'Servers'}:** ${total} • **Page ${currentPage}/${totalPages}**`,
        fields,
        0x5865F2
      );
    };

    // Build detailed server info container
    const buildDetailContainer = (serverId) => {
      const server = client.guilds.cache.get(serverId);
      if (!server) {
        return ContainerBuilder.error("Server Not Found", "This server is no longer available.", 0xFF0000);
      }

      const owner = server.members.cache.get(server.ownerId) || { user: { tag: "Unknown", id: server.ownerId } };
      const humans = server.members.cache.filter(m => !m.user.bot).size;
      const bots = server.members.cache.filter(m => m.user.bot).size;
      const textChannels = server.channels.cache.filter(c => c.type === 0).size;
      const voiceChannels = server.channels.cache.filter(c => c.type === 2).size;
      const categories = server.channels.cache.filter(c => c.type === 4).size;
      const createdTimestamp = Math.floor(server.createdTimestamp / 1000);

      return ContainerBuilder.serverInfo({
        title: `🔍 ${server.name}`,
        description: `**Server ID:** \`${server.id}\`\n**Created:** <t:${createdTimestamp}:F>\n**Owner:** ${owner.user.tag} (<@${owner.user.id}>)`,
        thumbnail: server.iconURL({ dynamic: true, size: 256 }),
        fields: [
          {
            name: "👥 Members",
            value: `**Total:** ${server.memberCount}\n**Humans:** ${humans}\n**Bots:** ${bots}`,
            inline: true,
          },
          {
            name: "📺 Channels",
            value: `**Total:** ${server.channels.cache.size}\n**Text:** ${textChannels}\n**Voice:** ${voiceChannels}`,
            inline: true,
          },
          {
            name: "📁 Other Stats",
            value: `**Categories:** ${categories}\n**Roles:** ${server.roles.cache.size}\n**Emojis:** ${server.emojis.cache.size}`,
            inline: true,
          },
          {
            name: "⚡ Boost Status",
            value: `**Level:** ${server.premiumTier}/3\n**Boosts:** ${server.premiumSubscriptionCount || 0}`,
            inline: true,
          },
          {
            name: "🔒 Verification",
            value: `**Level:** ${server.verificationLevel}\n**Vanity:** ${server.vanityURLCode || 'None'}`,
            inline: true,
          },
          {
            name: "🌍 Other Info",
            value: `**Preferred Locale:** ${server.preferredLocale}\n**Features:** ${server.features.length}`,
            inline: true,
          }
        ],
        accentColor: 0x00FF00,
        buttons: [
          {
            label: "Back to List",
            customId: "backToList",
            style: "Secondary",
            emoji: "◀️"
          },
          {
            label: "Leave Server",
            customId: `leave_${serverId}`,
            style: "Danger",
            emoji: "🚪"
          }
        ]
      });
    };

    // Build components
    const buildComponents = (showDropdown = true) => {
      const components = [];

      // Dropdown for server selection
      if (showDropdown && servers.length > 0) {
        const start = (currentPage - 1) * maxPerPage;
        const end = Math.min(start + maxPerPage, total);
        const options = [];

        for (let i = start; i < end; i++) {
          const server = servers[i];
          options.push(
            new StringSelectMenuOptionBuilder()
              .setLabel(server.name.substring(0, 100))
              .setValue(server.id)
              .setDescription(`${server.memberCount} members • ID: ${server.id}`.substring(0, 100))
              .setEmoji('🏠')
          );
        }

        if (options.length > 0) {
          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('serverSelect')
            .setPlaceholder('Select a server to view details')
            .addOptions(options);

          components.push(new ActionRowBuilder().addComponents(selectMenu));
        }
      }

      // Navigation buttons
      const buttons = [
        new ButtonBuilder()
          .setCustomId("firstPage")
          .setEmoji("⏮️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === 1),
        new ButtonBuilder()
          .setCustomId("prevPage")
          .setEmoji("◀️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === 1),
        new ButtonBuilder()
          .setCustomId("nextPage")
          .setEmoji("▶️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === totalPages),
        new ButtonBuilder()
          .setCustomId("lastPage")
          .setEmoji("⏭️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === totalPages),
        new ButtonBuilder()
          .setCustomId("refreshList")
          .setEmoji("🔄")
          .setLabel("Refresh")
          .setStyle(ButtonStyle.Primary)
      ];

      components.push(new ActionRowBuilder().addComponents(buttons));
      return components;
    };

    // Send initial message
    const container = buildListContainer();
    const components = buildComponents(true);
    const sentMsg = await channel.send({
      flags: container.flags,
      components: [...container.components, ...components],
    });

    // Collector for interactions
    const collector = channel.createMessageComponentCollector({
      filter: (interaction) => interaction.user.id === member.id && interaction.message.id === sentMsg.id,
      idle: IDLE_TIMEOUT * 1000,
    });

    collector.on("collect", async (interaction) => {
      try {
        await interaction.deferUpdate();

        // Handle server selection dropdown
        if (interaction.customId === 'serverSelect') {
          selectedServerId = interaction.values[0];
          const detailContainer = buildDetailContainer(selectedServerId);
          await sentMsg.edit(detailContainer);
          return;
        }

        // Handle back to list button
        if (interaction.customId === 'backToList') {
          selectedServerId = null;
          const listContainer = buildListContainer();
          const components = buildComponents(true);
          await sentMsg.edit({
            flags: listContainer.flags,
            components: [...listContainer.components, ...components],
          });
          return;
        }

        // Handle leave server button
        if (interaction.customId.startsWith('leave_')) {
          const serverId = interaction.customId.replace('leave_', '');
          const server = client.guilds.cache.get(serverId);
          
          if (server) {
            const confirmContainer = ContainerBuilder.warning(
              "⚠️ Confirm Leave Server",
              `Are you sure you want to leave **${server.name}**?\n\n**This action cannot be undone!**`,
              0xFFA500,
              [
                {
                  label: "Cancel",
                  customId: `cancel_leave_${serverId}`,
                  style: "Secondary"
                },
                {
                  label: "Confirm Leave",
                  customId: `confirm_leave_${serverId}`,
                  style: "Danger"
                }
              ]
            );
            await sentMsg.edit(confirmContainer);
          }
          return;
        }

        // Handle confirm leave
        if (interaction.customId.startsWith('confirm_leave_')) {
          const serverId = interaction.customId.replace('confirm_leave_', '');
          const server = client.guilds.cache.get(serverId);
          
          if (server) {
            const serverName = server.name;
            await server.leave();
            
            const successContainer = ContainerBuilder.success(
              "<:success:1424072640829722745> Left Server",
              `Successfully left **${serverName}**`,
              0x00FF00
            );
            await sentMsg.edit({ ...successContainer, components: [] });
            collector.stop();
          }
          return;
        }

        // Handle cancel leave
        if (interaction.customId.startsWith('cancel_leave_')) {
          const serverId = interaction.customId.replace('cancel_leave_', '');
          const detailContainer = buildDetailContainer(serverId);
          await sentMsg.edit(detailContainer);
          return;
        }

        // Handle pagination
        switch (interaction.customId) {
          case "firstPage":
            currentPage = 1;
            break;
          case "prevPage":
            if (currentPage > 1) currentPage--;
            break;
          case "nextPage":
            if (currentPage < totalPages) currentPage++;
            break;
          case "lastPage":
            currentPage = totalPages;
            break;
          case "refreshList":
            // Refresh happens by rebuilding
            break;
        }

        const listContainer = buildListContainer();
        const newComponents = buildComponents(true);
        await sentMsg.edit({ ...listContainer, components: newComponents });

      } catch (error) {
        console.error("Error handling interaction:", error);
      }
    });

    collector.on("end", async () => {
      try {
        await sentMsg.edit({ components: [] });
      } catch (error) {
        // Message might be deleted
      }
    });
  },
};
