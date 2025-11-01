const QueueProcessor = require("./QueueProcessor");
const CacheProcessor = require("./CacheProcessor");
const SearchProcessor = require("./SearchProcessor");
const PerformanceProcessor = require("./PerformanceProcessor");
const DataProcessor = require("./DataProcessor");

/**
 * Master Processor Manager
 * High-Performance Processing System for handling 200+ servers
 */
class ProcessorManager {
  constructor(client) {
    this.client = client;
    
    // Initialize processors
    this.queue = new QueueProcessor({
      maxConcurrent: 50,
      rateLimit: 200,
      priorityLevels: 5
    });
    
    this.cache = new CacheProcessor({
      maxSize: 50000, // Large cache for 200+ servers
      defaultTTL: 3600000 // 1 hour
    });
    
    this.searchProcessor = new SearchProcessor({
      maxRequests: 100,
      perMinute: 60
    });
    
    this.performance = new PerformanceProcessor({
      monitoringInterval: 30000,
      memoryThreshold: 0.85
    });
    
    this.data = DataProcessor;
    
    // Setup event handlers
    this.setupEventHandlers();
    
    client.logger.log("✅ Advanced Processor System initialized");
    client.logger.log(`📊 Queue: ${this.queue.maxConcurrent} concurrent, Cache: ${this.cache.maxSize} items`);
  }

  /**
   * Setup event handlers for monitoring
   */
  setupEventHandlers() {
    // Performance alerts
    this.performance.on("alert", (alert) => {
      this.client.logger.warn(`Performance Alert [${alert.type}]: ${alert.message}`);
    });
    
    // Queue monitoring
    this.queue.on("failed", (task) => {
      this.client.logger.error(`Queue task failed: ${task.id}`);
    });
    
    // Cache monitoring
    this.cache.on("evict", ({ key }) => {
      this.client.logger.debug(`Cache evicted: ${key}`);
    });
  }

  /**
   * Process database query with caching
   */
  async cachedQuery(key, queryFn, ttl = 300000) {
    return await this.cache.getOrSet(key, queryFn, ttl);
  }

  /**
   * Enqueue task with priority
   */
  enqueueTask(task, priority = 2) {
    return this.queue.enqueue(task, priority);
  }

  /**
   * Perform web search
   */
  async search(query, options) {
    return await this.searchProcessor.search(query, options);
  }

  /**
   * Get comprehensive system stats
   */
  getSystemStats() {
    return {
      queue: this.queue.getMetrics(),
      cache: this.cache.getStats(),
      search: this.searchProcessor.getStats(),
      performance: this.performance.getStatistics(),
      health: this.performance.getHealth()
    };
  }

  /**
   * Optimize system resources
   */
  optimize() {
    // Clear old cache entries
    this.cache.cleanup();
    
    // Force garbage collection if available
    this.performance.forceGC();
    
    // Clear queue if idle
    if (this.queue.processing.size === 0 && this.queue.getTotalQueueSize() === 0) {
      this.queue.clear();
    }
    
    this.client.logger.log("🔧 System optimization completed");
    
    return this.getSystemStats();
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.client.logger.log("🛑 Shutting down processors...");
    
    this.queue.pause();
    this.performance.stop();
    this.cache.destroy();
    
    this.client.logger.log("✅ Processors shut down successfully");
  }
}

module.exports = {
  ProcessorManager,
  QueueProcessor,
  CacheProcessor,
  SearchProcessor,
  PerformanceProcessor,
  DataProcessor
};
