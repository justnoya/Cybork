const {
  ChannelType,
  ComponentType,
  ButtonStyle,
  PermissionFlagsBits,
  TextInputStyle,
  EmbedBuilder,
} = require("discord.js");
const ems = require("enhanced-ms");
const InteractionUtils = require("@helpers/InteractionUtils");
const ContainerBuilder = require("@helpers/ContainerBuilder");
const { getSettings } = require("@schemas/Guild");
const { EMBED_COLORS, GIVEAWAYS } = require("@root/config");
const { getEmoji } = require("@helpers/EmojiUtils");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "gstart",
  description: "Start a giveaway with interactive setup",
  category: "GIVEAWAY",
  botPermissions: ["SendMessages", "EmbedLinks"],
  userPermissions: ["ManageMessages"],
  command: {
    enabled: true,
    usage: "",
  },
  slashCommand: {
    enabled: true,
    ephemeral: true,
  },

  async messageRun(message, args) {
    await showSetupMenu(message, false);
  },

  async interactionRun(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await showSetupMenu(interaction, true);
  },
};

/**
 * Show giveaway setup menu
 */
async function showSetupMenu(source, isInteraction) {
  const embed = InteractionUtils.createThemedEmbed({
    title: "🎉 Giveaway Setup",
    description: "Click the button below to start setting up your giveaway:",
    fields: [
      {
        name: "What you'll configure",
        value: "• Prize\n• Duration\n• Number of winners\n• Host (optional)\n• Channel (optional)",
        inline: false,
      },
    ],
    footer: "Setup expires in 2 minutes",
    timestamp: true,
  });

  const row = InteractionUtils.createButtonRow([
    {
      customId: "giveaway_setup",
      label: "Setup Giveaway",
      emoji: "🎁",
      style: ButtonStyle.Success,
    },
  ]);

  const msg = isInteraction
    ? await source.editReply({ embeds: [embed], components: [row] })
    : await source.reply({ embeds: [embed], components: [row] });

  const btnInteraction = await InteractionUtils.awaitComponent(
    msg,
    isInteraction ? source.user.id : source.author.id,
    { customId: "giveaway_setup", componentType: ComponentType.Button },
    120000
  );

  if (!btnInteraction) {
    return msg.edit({
      embeds: [InteractionUtils.createErrorEmbed("Setup timed out. Please try again.")],
      components: [],
    });
  }

  await showMainSetupModal(btnInteraction);
}

/**
 * Show main setup modal
 */
async function showMainSetupModal(interaction) {
  const modal = InteractionUtils.createModal("giveaway_main_modal", "Giveaway Configuration", [
    {
      customId: "prize",
      label: "Prize",
      style: TextInputStyle.Short,
      placeholder: "What are you giving away?",
      required: true,
      minLength: 1,
      maxLength: 256,
    },
    {
      customId: "duration",
      label: "Duration",
      style: TextInputStyle.Short,
      placeholder: "e.g., 1h, 1d, 1w, 30m",
      required: true,
      value: "1d",
    },
    {
      customId: "winners",
      label: "Number of Winners",
      style: TextInputStyle.Short,
      placeholder: "How many winners?",
      required: true,
      value: "1",
    },
    {
      customId: "channel_id",
      label: "Channel ID (optional)",
      style: TextInputStyle.Short,
      placeholder: "Leave empty for current channel",
      required: false,
    },
    {
      customId: "host_id",
      label: "Host User ID (optional)",
      style: TextInputStyle.Short,
      placeholder: "Leave empty to be the host",
      required: false,
    },
  ]);

  await interaction.showModal(modal);

  const modalSubmit = await InteractionUtils.awaitModalSubmit(
    interaction,
    "giveaway_main_modal",
    300000
  );

  if (!modalSubmit) return;

  await processGiveawaySetup(modalSubmit);
}

/**
 * Process giveaway setup
 */
async function processGiveawaySetup(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const prize = interaction.fields.getTextInputValue("prize");
  const durationStr = interaction.fields.getTextInputValue("duration");
  const winnersStr = interaction.fields.getTextInputValue("winners");
  const channelId = interaction.fields.getTextInputValue("channel_id");
  const hostId = interaction.fields.getTextInputValue("host_id");

  // Validate duration
  const duration = ems(durationStr);
  if (!duration) {
    return interaction.followUp({
      embeds: [InteractionUtils.createErrorEmbed("Invalid duration format! Use: 1h, 1d, 1w, 30m")],
      ephemeral: true,
    });
  }

  // Validate winners
  const winners = parseInt(winnersStr);
  if (isNaN(winners) || winners < 1) {
    return interaction.followUp({
      embeds: [InteractionUtils.createErrorEmbed("Winners must be a number greater than 0!")],
      ephemeral: true,
    });
  }

  // Get channel
  let giveawayChannel = interaction.channel;
  if (channelId) {
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildText) {
      return interaction.followUp({
        embeds: [InteractionUtils.createErrorEmbed("Invalid channel ID! Must be a text channel.")],
        ephemeral: true,
      });
    }
    giveawayChannel = channel;
  }

  // Check permissions
  const perms = ["ViewChannel", "SendMessages", "EmbedLinks"];
  if (!giveawayChannel.permissionsFor(interaction.guild.members.me).has(perms)) {
    return interaction.followUp({
      embeds: [
        InteractionUtils.createErrorEmbed(
          `I need \`${perms.join(", ")}\` permissions in ${giveawayChannel}!`
        ),
      ],
      ephemeral: true,
    });
  }

  // Get host
  let host = interaction.user;
  if (hostId) {
    const hostUser = await interaction.client.users.fetch(hostId).catch(() => null);
    if (!hostUser) {
      return interaction.followUp({
        embeds: [InteractionUtils.createErrorEmbed("Invalid host user ID!")],
        ephemeral: true,
      });
    }
    host = hostUser;
  }

  // Show confirmation
  await showGiveawayConfirmation(interaction, {
    prize,
    duration,
    durationStr,
    winners,
    channel: giveawayChannel,
    host,
  });
}

/**
 * Show giveaway confirmation
 */
async function showGiveawayConfirmation(interaction, data) {
  // Default to modern style
  data.useModernStyle = true;
  
  const embed = InteractionUtils.createThemedEmbed({
    title: "🎉 Giveaway Preview",
    description: "Review your giveaway settings and choose the display style:",
    fields: [
      { name: "Prize", value: data.prize, inline: false },
      { name: "Duration", value: data.durationStr, inline: true },
      { name: "Winners", value: data.winners.toString(), inline: true },
      { name: "Channel", value: data.channel.toString(), inline: true },
      { name: "Host", value: data.host.toString(), inline: true },
      { name: "UI Style", value: "🎨 Modern (Default)", inline: false },
    ],
    footer: "Choose style and confirm to start the giveaway",
    timestamp: true,
  });

  const styleRow = InteractionUtils.createButtonRow([
    {
      customId: "style_modern",
      label: "Modern Style",
      emoji: "🎨",
      style: ButtonStyle.Success,
    },
    {
      customId: "style_classic",
      label: "Classic Style",
      emoji: "📜",
      style: ButtonStyle.Secondary,
    },
  ]);

  const confirmRow = InteractionUtils.createButtonRow([
    {
      customId: "confirm_giveaway",
      label: "Start Giveaway",
      emoji: "✅",
      style: ButtonStyle.Success,
    },
    {
      customId: "cancel_giveaway",
      label: "Cancel",
      emoji: "❌",
      style: ButtonStyle.Danger,
    },
  ]);

  const msg = await interaction.followUp({
    embeds: [embed],
    components: [styleRow, confirmRow],
    ephemeral: true,
  });

  // Create collector for style toggle and confirm
  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === interaction.user.id,
    time: 60000,
  });

  collector.on("collect", async (btnInteraction) => {
    if (btnInteraction.customId === "style_modern") {
      data.useModernStyle = true;
      const updatedEmbed = InteractionUtils.createThemedEmbed({
        title: "🎉 Giveaway Preview",
        description: "Review your giveaway settings and choose the display style:",
        fields: [
          { name: "Prize", value: data.prize, inline: false },
          { name: "Duration", value: data.durationStr, inline: true },
          { name: "Winners", value: data.winners.toString(), inline: true },
          { name: "Channel", value: data.channel.toString(), inline: true },
          { name: "Host", value: data.host.toString(), inline: true },
          { name: "UI Style", value: "🎨 Modern ✅", inline: false },
        ],
        footer: "Choose style and confirm to start the giveaway",
        timestamp: true,
      });
      await btnInteraction.update({ embeds: [updatedEmbed] });
    } else if (btnInteraction.customId === "style_classic") {
      data.useModernStyle = false;
      const updatedEmbed = InteractionUtils.createThemedEmbed({
        title: "🎉 Giveaway Preview",
        description: "Review your giveaway settings and choose the display style:",
        fields: [
          { name: "Prize", value: data.prize, inline: false },
          { name: "Duration", value: data.durationStr, inline: true },
          { name: "Winners", value: data.winners.toString(), inline: true },
          { name: "Channel", value: data.channel.toString(), inline: true },
          { name: "Host", value: data.host.toString(), inline: true },
          { name: "UI Style", value: "📜 Classic ✅", inline: false },
        ],
        footer: "Choose style and confirm to start the giveaway",
        timestamp: true,
      });
      await btnInteraction.update({ embeds: [updatedEmbed] });
    } else if (btnInteraction.customId === "confirm_giveaway") {
      await btnInteraction.deferUpdate();
      collector.stop();
      await startGiveaway(interaction, data, btnInteraction);
    } else if (btnInteraction.customId === "cancel_giveaway") {
      await btnInteraction.update({
        embeds: [InteractionUtils.createWarningEmbed("Giveaway cancelled.")],
        components: [],
      });
      collector.stop();
    }
  });

  collector.on("end", () => {
    if (msg.components.length > 0) {
      msg.edit({ components: InteractionUtils.disableComponents(msg.components) }).catch(() => {});
    }
  });
}

/**
 * Create modern professional giveaway embed with Container design
 */
function createModernGiveawayEmbed(options) {
  const {
    prize,
    winnerCount,
    endTime,
    hostedBy,
    guild,
    isEnded = false,
    winners = null,
    reaction = "🎁",
  } = options;

  const endTimestamp = Math.floor(endTime.getTime() / 1000);
  const serverIcon = guild.iconURL({ size: 128 }) || "https://cdn.discordapp.com/embed/avatars/0.png";
  
  if (isEnded) {
    const components = [];
    
    components.push(ContainerBuilder.createTextDisplay(`# 🎉 **GIVEAWAY ENDED**`));
    components.push(ContainerBuilder.createSeparator());
    components.push(ContainerBuilder.createTextDisplay(`## 🏆 ${prize}`));
    components.push(ContainerBuilder.createSeparator());
    
    if (winners && winners.length > 0) {
      const winnerList = winners.map((w, i) => `\`${i + 1}.\` <@${w}>`).join("\n");
      components.push(ContainerBuilder.createTextDisplay(`### 👑 Winners\n${winnerList}`));
    } else {
      components.push(ContainerBuilder.createTextDisplay(`### ⚠️ No Winners\n\`No valid participants entered\``));
    }
    
    components.push(ContainerBuilder.createSeparator());
    components.push(
      ContainerBuilder.createTextDisplay(
        `• **Ended:** <t:${endTimestamp}:R>\n• **Host:** ${hostedBy}\n• **Server:** ${guild.name}`
      )
    );
    
    return new ContainerBuilder()
      .addContainer({ 
        accentColor: 0xFF4444,
        components: components
      })
      .build();
  }
  
  const components = [];
  
  components.push(ContainerBuilder.createTextDisplay(`# 🎁 **GIVEAWAY**`));
  components.push(ContainerBuilder.createSeparator());
  components.push(ContainerBuilder.createTextDisplay(`## 🎉 ${prize}`));
  components.push(ContainerBuilder.createSeparator());
  components.push(
    ContainerBuilder.createTextDisplay(
      `### How to Enter\nReact with ${reaction} below to participate in this giveaway!`
    )
  );
  components.push(ContainerBuilder.createSeparator());
  components.push(
    ContainerBuilder.createTextDisplay(
      `• **Winners:** \`${winnerCount}\` ${winnerCount === 1 ? "person" : "people"}\n• **Ends:** <t:${endTimestamp}:R> (<t:${endTimestamp}:F>)\n• **Host:** ${hostedBy}\n• **Server:** ${guild.name}`
    )
  );
  
  return new ContainerBuilder()
    .addContainer({ 
      accentColor: 0x5865F2,
      components: components
    })
    .build();
}

/**
 * Create default/classic giveaway embed
 */
function createClassicGiveawayEmbed(options) {
  const {
    prize,
    winnerCount,
    endTime,
    hostedBy,
    guild,
    isEnded = false,
    winners = null,
    reaction = "🎁",
  } = options;

  const endTimestamp = Math.floor(endTime.getTime() / 1000);
  
  const embed = new EmbedBuilder()
    .setTitle(isEnded ? "🎉 GIVEAWAY ENDED" : "🎉 GIVEAWAY")
    .setDescription(
      isEnded
        ? `**${prize}**\n\n${
            winners && winners.length > 0
              ? `**Winners:** ${winners.map((w) => `<@${w}>`).join(", ")}`
              : "No valid participants"
          }`
        : `**${prize}**\n\nReact with ${reaction} to enter!`
    )
    .setColor(isEnded ? 0xff0000 : parseInt(GIVEAWAYS.START_EMBED?.replace("#", "0x") || "0x00FF00", 16))
    .addFields(
      { name: "Winners", value: `${winnerCount}`, inline: true },
      {
        name: isEnded ? "Ended" : "Ends",
        value: `<t:${endTimestamp}:R>`,
        inline: true,
      },
      { name: "Hosted by", value: `${hostedBy}`, inline: true }
    )
    .setFooter({ text: guild.name, iconURL: guild.iconURL() })
    .setTimestamp();

  return { embeds: [embed] };
}

/**
 * Start the giveaway
 */
async function startGiveaway(interaction, data, btnInteraction) {
  try {
    const endTime = new Date(Date.now() + data.duration);
    
    // Get guild settings to check for custom reaction emoji
    const settings = await getSettings(interaction.guild);
    const reactionEmoji = settings.giveaway_reaction || GIVEAWAYS.REACTION || "🎁";
    
    // Use selected style (modern or classic)
    const useModern = data.useModernStyle !== false;
    const displayMessage = useModern
      ? createModernGiveawayEmbed({
          prize: data.prize,
          winnerCount: data.winners,
          endTime: endTime,
          hostedBy: data.host,
          guild: interaction.guild,
          reaction: reactionEmoji,
        })
      : createClassicGiveawayEmbed({
          prize: data.prize,
          winnerCount: data.winners,
          endTime: endTime,
          hostedBy: data.host,
          guild: interaction.guild,
          reaction: reactionEmoji,
        });

    const options = {
      duration: data.duration,
      prize: data.prize,
      winnerCount: data.winners,
      hostedBy: data.host,
      thumbnail: "https://i.imgur.com/DJuTuxs.png",
      reaction: reactionEmoji,
      messages: {
        giveaway: "🎉 **GIVEAWAY** 🎉",
        giveawayEnded: "🎉 **GIVEAWAY ENDED** 🎉",
        inviteToParticipate: `React with ${reactionEmoji} to enter!`,
        winMessage: "Congratulations, {winners}! You won **{this.prize}**!",
        embedFooter: "Giveaway Time!",
        noWinner: "Giveaway cancelled, no valid participants.",
        hostedBy: `\nHosted by: ${data.host.tag}`,
        winners: "Winner(s):",
        endedAt: "Ended at",
      },
    };

    const giveaway = await interaction.client.giveawaysManager.start(data.channel, options);
    
    // Update giveaway message with selected design and toggle button
    try {
      const message = await data.channel.messages.fetch(giveaway.messageId);
      
      const toggleRow = InteractionUtils.createButtonRow([
        {
          customId: `giveaway_toggle_${giveaway.messageId}_${useModern ? "modern" : "classic"}`,
          label: useModern ? "Switch to Classic" : "Switch to Modern",
          emoji: "🔄",
          style: ButtonStyle.Secondary,
        },
      ]);

      // Ensure components array exists and add toggle button
      const componentsList = Array.isArray(displayMessage.components) ? [...displayMessage.components] : [];
      componentsList.push(toggleRow);

      await message.edit({
        ...displayMessage,
        components: componentsList,
      });

      // Setup collector for toggle button
      setupToggleCollector(message, {
        prize: data.prize,
        winnerCount: data.winners,
        endTime: endTime,
        hostedBy: data.host,
        guild: interaction.guild,
        reaction: reactionEmoji,
        messageId: giveaway.messageId,
      });
    } catch (err) {
      console.error("Failed to update giveaway message:", err);
    }

    const successEmbed = InteractionUtils.createThemedEmbed({
      title: "✅ Giveaway Started!",
      description: `Your giveaway has been started in ${data.channel}`,
      fields: [
        { name: "Prize", value: data.prize, inline: true },
        { name: "Duration", value: data.durationStr, inline: true },
        { name: "Winners", value: data.winners.toString(), inline: true },
        { name: "Reaction", value: reactionEmoji, inline: true },
        { name: "Message ID", value: giveaway.messageId || "N/A", inline: false },
        { name: "UI Style", value: useModern ? "Modern (with toggle button)" : "Classic (with toggle button)", inline: false },
      ],
      color: EMBED_COLORS.SUCCESS,
    });

    await btnInteraction.editReply({
      embeds: [successEmbed],
      components: [],
    });
  } catch (error) {
    console.error("Giveaway start error:", error);
    await btnInteraction.editReply({
      embeds: [InteractionUtils.createErrorEmbed(`Failed to start giveaway: ${error.message}`)],
      components: [],
    });
  }
}

/**
 * Setup toggle collector for switching between modern and classic UI
 */
function setupToggleCollector(message, giveawayData) {
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: giveawayData.endTime.getTime() - Date.now(),
  });

  let isModern = giveawayData.messageId.endsWith("modern");

  collector.on("collect", async (interaction) => {
    try {
      if (!interaction.customId.startsWith("giveaway_toggle_")) return;

      await interaction.deferUpdate();

      isModern = !isModern;

      const newMessage = isModern
        ? createModernGiveawayEmbed(giveawayData)
        : createClassicGiveawayEmbed(giveawayData);

      const toggleRow = InteractionUtils.createButtonRow([
        {
          customId: `giveaway_toggle_${giveawayData.messageId}_${isModern ? "modern" : "classic"}`,
          label: isModern ? "Switch to Classic" : "Switch to Modern",
          emoji: "🔄",
          style: ButtonStyle.Secondary,
        },
      ]);

      // Ensure components array exists and add toggle button
      const componentsList = Array.isArray(newMessage.components) ? [...newMessage.components] : [];
      componentsList.push(toggleRow);

      const editPayload = {
        ...newMessage,
        components: componentsList,
      };

      await message.edit(editPayload);
    } catch (error) {
      console.error("Toggle button error:", error);
    }
  });

  collector.on("end", () => {
    // Collector ended, giveaway is over
  });
}
