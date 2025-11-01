const EventEmitter = require("events");

/**
 * Performance Monitoring and Optimization Processor
 * Tracks system performance, memory usage, and provides optimization recommendations
 */
class PerformanceProcessor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.monitoringInterval = options.monitoringInterval || 30000; // 30 seconds
    this.historySize = options.historySize || 100; // Keep last 100 snapshots
    
    this.metrics = [];
    this.alerts = [];
    this.thresholds = {
      memoryUsage: options.memoryThreshold || 0.85, // 85%
      cpuUsage: options.cpuThreshold || 0.80, // 80%
      eventLoopDelay: options.eventLoopThreshold || 100 // 100ms
    };
    
    this.startTime = Date.now();
    this.lastCPUUsage = process.cpuUsage();
    
    // Start monitoring
    this.monitor();
  }

  /**
   * Collect current performance metrics
   */
  collectMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage(this.lastCPUUsage);
    this.lastCPUUsage = process.cpuUsage();
    
    const metric = {
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      cpu: {
        user: cpuUsage.user / 1000000, // Convert to milliseconds
        system: cpuUsage.system / 1000000
      },
      eventLoop: this.measureEventLoopDelay(),
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform
      }
    };
    
    this.metrics.push(metric);
    
    // Keep only recent history
    if (this.metrics.length > this.historySize) {
      this.metrics.shift();
    }
    
    // Check thresholds and emit alerts
    this.checkThresholds(metric);
    
    return metric;
  }

  /**
   * Measure event loop delay
   */
  measureEventLoopDelay() {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const delay = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
      this.lastEventLoopDelay = delay;
    });
    return this.lastEventLoopDelay || 0;
  }

  /**
   * Check performance thresholds
   */
  checkThresholds(metric) {
    const alerts = [];
    
    if (metric.memory.percentage / 100 > this.thresholds.memoryUsage) {
      alerts.push({
        type: "memory",
        severity: "warning",
        message: `Memory usage at ${metric.memory.percentage.toFixed(2)}%`,
        value: metric.memory.percentage,
        threshold: this.thresholds.memoryUsage * 100
      });
    }
    
    if (metric.eventLoop > this.thresholds.eventLoopDelay) {
      alerts.push({
        type: "eventLoop",
        severity: "warning",
        message: `Event loop delay at ${metric.eventLoop.toFixed(2)}ms`,
        value: metric.eventLoop,
        threshold: this.thresholds.eventLoopDelay
      });
    }
    
    if (alerts.length > 0) {
      this.alerts.push(...alerts);
      alerts.forEach(alert => this.emit("alert", alert));
    }
  }

  /**
   * Start periodic monitoring
   */
  monitor() {
    this.monitorInterval = setInterval(() => {
      const metrics = this.collectMetrics();
      this.emit("metrics", metrics);
    }, this.monitoringInterval);
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics() {
    return this.collectMetrics();
  }

  /**
   * Get historical metrics
   */
  getHistory() {
    return this.metrics;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    if (this.metrics.length === 0) return null;
    
    const memUsages = this.metrics.map(m => m.memory.percentage);
    const eventLoopDelays = this.metrics.map(m => m.eventLoop);
    
    return {
      memory: {
        current: memUsages[memUsages.length - 1],
        average: memUsages.reduce((a, b) => a + b) / memUsages.length,
        min: Math.min(...memUsages),
        max: Math.max(...memUsages)
      },
      eventLoop: {
        current: eventLoopDelays[eventLoopDelays.length - 1],
        average: eventLoopDelays.reduce((a, b) => a + b) / eventLoopDelays.length,
        min: Math.min(...eventLoopDelays),
        max: Math.max(...eventLoopDelays)
      },
      uptime: process.uptime(),
      alerts: this.alerts.length
    };
  }

  /**
   * Get optimization recommendations
   */
  getRecommendations() {
    const stats = this.getStatistics();
    if (!stats) return [];
    
    const recommendations = [];
    
    if (stats.memory.average > 70) {
      recommendations.push({
        type: "memory",
        priority: "high",
        message: "Consider implementing more aggressive caching strategies or clearing old data",
        action: "Optimize memory usage"
      });
    }
    
    if (stats.eventLoop.average > 50) {
      recommendations.push({
        type: "performance",
        priority: "medium",
        message: "Event loop delay is high. Consider using worker threads for CPU-intensive tasks",
        action: "Distribute workload"
      });
    }
    
    if (this.metrics.length > 50 && stats.memory.max - stats.memory.min > 30) {
      recommendations.push({
        type: "stability",
        priority: "medium",
        message: "Memory usage fluctuates significantly. Consider implementing memory pooling",
        action: "Stabilize memory patterns"
      });
    }
    
    return recommendations;
  }

  /**
   * Force garbage collection if available
   */
  forceGC() {
    if (global.gc) {
      global.gc();
      this.emit("gc", { timestamp: Date.now() });
      return true;
    }
    return false;
  }

  /**
   * Get health status
   */
  getHealth() {
    const stats = this.getStatistics();
    if (!stats) return { status: "unknown" };
    
    let status = "healthy";
    const issues = [];
    
    if (stats.memory.current > 80) {
      status = "warning";
      issues.push("High memory usage");
    }
    
    if (stats.eventLoop.current > 100) {
      status = status === "warning" ? "critical" : "warning";
      issues.push("High event loop delay");
    }
    
    if (this.alerts.length > 10) {
      status = "warning";
      issues.push("Multiple performance alerts");
    }
    
    return {
      status,
      issues,
      uptime: stats.uptime,
      recommendations: this.getRecommendations()
    };
  }

  /**
   * Clear alerts
   */
  clearAlerts() {
    this.alerts = [];
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
  }

  /**
   * Destroy processor
   */
  destroy() {
    this.stop();
    this.metrics = [];
    this.alerts = [];
  }
}

module.exports = PerformanceProcessor;
