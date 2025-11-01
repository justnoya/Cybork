const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const InteractionUtils = require("@helpers/InteractionUtils");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "system",
  description: "Advanced system monitoring and processor statistics",
  category: "OWNER",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: false,
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "action",
        description: "System action to perform",
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: "Stats - View system statistics", value: "stats" },
          { name: "Health - Check system health", value: "health" },
          { name: "Search - Test internet search", value: "search" },
          { name: "Optimize - Optimize system resources", value: "optimize" },
          { name: "Cache - View cache statistics", value: "cache" },
          { name: "Queue - View queue metrics", value: "queue" },
        ],
      },
      {
        name: "query",
        description: "Search query (only for search action)",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },

  async interactionRun(interaction) {
    const action = interaction.options.getString("action");
    const query = interaction.options.getString("query");

    await interaction.deferReply();

    try {
      switch (action) {
        case "stats":
          return await showSystemStats(interaction);
        case "health":
          return await showSystemHealth(interaction);
        case "search":
          return await performSearch(interaction, query);
        case "optimize":
          return await optimizeSystem(interaction);
        case "cache":
          return await showCacheStats(interaction);
        case "queue":
          return await showQueueMetrics(interaction);
        default:
          return interaction.editReply({ content: "Unknown action" });
      }
    } catch (error) {
      interaction.client.logger.error("System command error:", error);
      return interaction.editReply({
        embeds: [InteractionUtils.createErrorEmbed("Failed to execute system command: " + error.message)],
      });
    }
  },
};

async function showSystemStats(interaction) {
  const stats = interaction.client.processors.getSystemStats();
  
  const embed = new EmbedBuilder()
    .setColor("#00ff00")
    .setTitle("🚀 Advanced Processor System Stats")
    .setDescription("High-Performance System for 200+ Servers")
    .addFields(
      {
        name: "📊 Queue Processor",
        value: [
          `Tasks Processed: ${stats.queue.totalProcessed}`,
          `Tasks Failed: ${stats.queue.totalFailed}`,
          `Current Processing: ${stats.queue.currentProcessing}`,
          `Queue Size: ${stats.queue.currentQueueSize}`,
          `Peak Concurrency: ${stats.queue.peakConcurrency}`,
          `Avg Processing: ${stats.queue.averageProcessingTime.toFixed(2)}ms`,
          `Tasks/Second: ${stats.queue.tasksPerSecond.toFixed(2)}`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "💾 Cache Processor",
        value: [
          `Cache Hits: ${stats.cache.hits}`,
          `Cache Misses: ${stats.cache.misses}`,
          `Hit Rate: ${stats.cache.hitRate}`,
          `Cache Size: ${stats.cache.size}/${stats.cache.maxSize}`,
          `Usage: ${stats.cache.usage}`,
          `Evictions: ${stats.cache.evictions}`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "🔍 Search Processor",
        value: [
          `Total Searches: ${stats.search.searches}`,
          `Cached Results: ${stats.search.cached}`,
          `Failed: ${stats.search.failed}`,
          `Cache Hit Rate: ${stats.search.cacheHitRate.toFixed(2)}%`,
          `Avg Time: ${stats.search.averageTime.toFixed(2)}ms`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "⚡ Performance",
        value: [
          `Memory: ${stats.performance.memory.current.toFixed(2)}%`,
          `Avg Memory: ${stats.performance.memory.average.toFixed(2)}%`,
          `Event Loop: ${stats.performance.eventLoop.current.toFixed(2)}ms`,
          `Uptime: ${(stats.performance.uptime / 3600).toFixed(2)}h`,
          `Alerts: ${stats.performance.alerts}`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "🏥 Health Status",
        value: `Status: ${getStatusEmoji(stats.health.status)} ${stats.health.status.toUpperCase()}`,
        inline: true,
      }
    )
    .setFooter({ text: "Advanced Processor System v2.0 - Unstoppable Performance" })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}

async function showSystemHealth(interaction) {
  const health = interaction.client.processors.performance.getHealth();
  const recommendations = interaction.client.processors.performance.getRecommendations();
  
  const embed = new EmbedBuilder()
    .setColor(health.status === "healthy" ? "#00ff00" : health.status === "warning" ? "#ffaa00" : "#ff0000")
    .setTitle(`🏥 System Health: ${getStatusEmoji(health.status)} ${health.status.toUpperCase()}`)
    .setDescription(`Uptime: ${(health.uptime / 3600).toFixed(2)} hours`);

  if (health.issues.length > 0) {
    embed.addFields({
      name: "⚠️ Issues Detected",
      value: health.issues.map(issue => `• ${issue}`).join("\n"),
    });
  }

  if (recommendations.length > 0) {
    embed.addFields({
      name: "💡 Recommendations",
      value: recommendations
        .map(rec => `**[${rec.priority.toUpperCase()}]** ${rec.message}`)
        .join("\n"),
    });
  } else {
    embed.addFields({
      name: "✅ System Status",
      value: "All systems operating normally. No optimization needed.",
    });
  }

  return interaction.editReply({ embeds: [embed] });
}

async function performSearch(interaction, query) {
  if (!query) {
    return interaction.editReply({
      embeds: [InteractionUtils.createErrorEmbed("Please provide a search query")],
    });
  }

  const startTime = Date.now();
  const result = await interaction.client.processors.search.search(query);
  const searchTime = Date.now() - startTime;

  const embed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle(`🔍 Search Results: ${query}`)
    .setDescription(result.answer || result.summary || "No results found")
    .addFields(
      {
        name: "Provider",
        value: result.provider,
        inline: true,
      },
      {
        name: "Search Time",
        value: `${searchTime}ms`,
        inline: true,
      }
    );

  if (result.url) {
    embed.setURL(result.url);
  }

  if (result.thumbnail) {
    embed.setThumbnail(result.thumbnail);
  }

  return interaction.editReply({ embeds: [embed] });
}

async function optimizeSystem(interaction) {
  const beforeStats = interaction.client.processors.getSystemStats();
  
  const stats = interaction.client.processors.optimize();
  
  const embed = new EmbedBuilder()
    .setColor("#00ff00")
    .setTitle("🔧 System Optimization Complete")
    .addFields(
      {
        name: "Cache Cleanup",
        value: `Before: ${beforeStats.cache.size} items\nAfter: ${stats.cache.size} items`,
        inline: true,
      },
      {
        name: "Memory Optimization",
        value: `Memory: ${stats.performance.memory.current.toFixed(2)}%`,
        inline: true,
      },
      {
        name: "Queue Status",
        value: `Processing: ${stats.queue.currentProcessing}\nQueued: ${stats.queue.currentQueueSize}`,
        inline: true,
      }
    )
    .setFooter({ text: "System optimized for maximum performance" })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}

async function showCacheStats(interaction) {
  const stats = interaction.client.processors.cache.getStats();
  
  const embed = new EmbedBuilder()
    .setColor("#9b59b6")
    .setTitle("💾 Cache Processor Statistics")
    .addFields(
      {
        name: "Performance",
        value: [
          `Hit Rate: ${stats.hitRate}`,
          `Total Hits: ${stats.hits}`,
          `Total Misses: ${stats.misses}`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "Capacity",
        value: [
          `Current Size: ${stats.size}`,
          `Max Size: ${stats.maxSize}`,
          `Usage: ${stats.usage}`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "Operations",
        value: [
          `Sets: ${stats.sets}`,
          `Deletes: ${stats.deletes}`,
          `Evictions: ${stats.evictions}`,
          `Expired: ${stats.expired}`,
        ].join("\n"),
        inline: true,
      }
    )
    .setFooter({ text: "Intelligent LRU Cache with TTL" });

  return interaction.editReply({ embeds: [embed] });
}

async function showQueueMetrics(interaction) {
  const metrics = interaction.client.processors.queue.getMetrics();
  
  const embed = new EmbedBuilder()
    .setColor("#e74c3c")
    .setTitle("📊 Queue Processor Metrics")
    .addFields(
      {
        name: "Throughput",
        value: [
          `Total Processed: ${metrics.totalProcessed}`,
          `Tasks/Second: ${metrics.tasksPerSecond.toFixed(2)}`,
          `Avg Processing: ${metrics.averageProcessingTime.toFixed(2)}ms`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "Current Status",
        value: [
          `Processing: ${metrics.currentProcessing}`,
          `Queued: ${metrics.currentQueueSize}`,
          `Peak Concurrency: ${metrics.peakConcurrency}`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "Reliability",
        value: [
          `Failed: ${metrics.totalFailed}`,
          `Success Rate: ${((metrics.totalProcessed / (metrics.totalProcessed + metrics.totalFailed)) * 100 || 100).toFixed(2)}%`,
          `Uptime: ${(metrics.uptime / 3600000).toFixed(2)}h`,
        ].join("\n"),
        inline: true,
      }
    )
    .setFooter({ text: "High-Performance Queue with Priority & Rate Limiting" });

  return interaction.editReply({ embeds: [embed] });
}

function getStatusEmoji(status) {
  const emojis = {
    healthy: "🟢",
    warning: "🟡",
    critical: "🔴",
    unknown: "⚪",
  };
  return emojis[status] || "⚪";
}
