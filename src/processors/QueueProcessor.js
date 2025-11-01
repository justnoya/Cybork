const EventEmitter = require("events");

/**
 * High-Performance Queue Processor
 * Handles concurrent task processing with rate limiting and priority queuing
 * Designed to handle 200+ servers efficiently
 */
class QueueProcessor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxConcurrent = options.maxConcurrent || 50; // Process 50 tasks simultaneously
    this.rateLimit = options.rateLimit || 100; // Max 100 tasks per second
    this.priorityLevels = options.priorityLevels || 5;
    
    this.queues = Array(this.priorityLevels).fill(null).map(() => []);
    this.processing = new Set();
    this.processed = 0;
    this.failed = 0;
    this.startTime = Date.now();
    
    this.rateLimitWindow = 1000; // 1 second
    this.rateLimitCounter = 0;
    this.rateLimitReset = Date.now() + this.rateLimitWindow;
    
    this.metrics = {
      totalProcessed: 0,
      totalFailed: 0,
      averageProcessingTime: 0,
      peakConcurrency: 0,
      currentQueueSize: 0
    };
  }

  /**
   * Add task to queue with priority (0 = highest, 4 = lowest)
   */
  enqueue(task, priority = 2) {
    if (priority < 0 || priority >= this.priorityLevels) {
      priority = 2; // Default to medium priority
    }
    
    const queuedTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fn: task,
      priority,
      enqueuedAt: Date.now(),
      attempts: 0,
      maxAttempts: 3
    };
    
    this.queues[priority].push(queuedTask);
    this.metrics.currentQueueSize++;
    this.emit("enqueued", queuedTask);
    
    // Start processing if not already running
    this.process();
    
    return queuedTask.id;
  }

  /**
   * Process queued tasks with concurrency control and rate limiting
   */
  async process() {
    // Check rate limit
    const now = Date.now();
    if (now >= this.rateLimitReset) {
      this.rateLimitCounter = 0;
      this.rateLimitReset = now + this.rateLimitWindow;
    }
    
    // Don't exceed concurrent limit or rate limit
    if (this.processing.size >= this.maxConcurrent || this.rateLimitCounter >= this.rateLimit) {
      return;
    }
    
    // Get next task from highest priority queue
    let task = null;
    for (let i = 0; i < this.priorityLevels; i++) {
      if (this.queues[i].length > 0) {
        task = this.queues[i].shift();
        this.metrics.currentQueueSize--;
        break;
      }
    }
    
    if (!task) return;
    
    this.processing.add(task.id);
    this.rateLimitCounter++;
    
    // Update peak concurrency metric
    if (this.processing.size > this.metrics.peakConcurrency) {
      this.metrics.peakConcurrency = this.processing.size;
    }
    
    const startTime = Date.now();
    
    try {
      await task.fn();
      
      const processingTime = Date.now() - startTime;
      this.metrics.totalProcessed++;
      this.metrics.averageProcessingTime = 
        (this.metrics.averageProcessingTime * (this.metrics.totalProcessed - 1) + processingTime) / 
        this.metrics.totalProcessed;
      
      this.emit("completed", {
        id: task.id,
        processingTime,
        queueTime: startTime - task.enqueuedAt
      });
    } catch (error) {
      task.attempts++;
      
      // Retry logic with exponential backoff
      if (task.attempts < task.maxAttempts) {
        const delay = Math.min(1000 * Math.pow(2, task.attempts), 10000);
        setTimeout(() => {
          this.queues[task.priority].unshift(task); // Add back to front of queue
          this.metrics.currentQueueSize++;
          this.process();
        }, delay);
        
        this.emit("retry", { id: task.id, attempt: task.attempts, error: error.message });
      } else {
        this.metrics.totalFailed++;
        this.emit("failed", { id: task.id, error: error.message });
      }
    } finally {
      this.processing.delete(task.id);
      
      // Continue processing if there are more tasks
      if (this.getTotalQueueSize() > 0) {
        setImmediate(() => this.process());
      }
    }
  }

  /**
   * Get total queue size across all priorities
   */
  getTotalQueueSize() {
    return this.queues.reduce((sum, queue) => sum + queue.length, 0);
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      currentProcessing: this.processing.size,
      currentQueueSize: this.getTotalQueueSize(),
      uptime: Date.now() - this.startTime,
      tasksPerSecond: this.metrics.totalProcessed / ((Date.now() - this.startTime) / 1000)
    };
  }

  /**
   * Clear all queues
   */
  clear() {
    this.queues.forEach(queue => queue.length = 0);
    this.metrics.currentQueueSize = 0;
    this.emit("cleared");
  }

  /**
   * Pause processing
   */
  pause() {
    this.paused = true;
    this.emit("paused");
  }

  /**
   * Resume processing
   */
  resume() {
    this.paused = false;
    this.emit("resumed");
    this.process();
  }
}

module.exports = QueueProcessor;
