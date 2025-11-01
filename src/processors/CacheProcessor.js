const EventEmitter = require("events");

/**
 * Intelligent Caching System
 * High-performance in-memory cache with TTL, LRU eviction, and statistics
 * Optimized for handling large numbers of servers
 */
class CacheProcessor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxSize = options.maxSize || 10000; // Store up to 10,000 items
    this.defaultTTL = options.defaultTTL || 3600000; // 1 hour default
    this.enableStats = options.enableStats !== false;
    
    this.cache = new Map();
    this.accessOrder = new Map(); // For LRU tracking
    this.expirations = new Map();
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      expired: 0
    };
    
    // Periodic cleanup of expired items
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Set cache item with optional TTL
   */
  set(key, value, ttl = this.defaultTTL) {
    // Remove oldest item if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    this.cache.set(key, value);
    this.accessOrder.set(key, Date.now());
    
    if (ttl > 0) {
      this.expirations.set(key, Date.now() + ttl);
    }
    
    this.stats.sets++;
    this.emit("set", { key, size: this.cache.size });
    
    return true;
  }

  /**
   * Get cache item
   */
  get(key) {
    if (!this.cache.has(key)) {
      this.stats.misses++;
      this.emit("miss", { key });
      return null;
    }
    
    // Check if expired
    if (this.isExpired(key)) {
      this.delete(key);
      this.stats.expired++;
      this.stats.misses++;
      return null;
    }
    
    // Update access time for LRU
    this.accessOrder.set(key, Date.now());
    this.stats.hits++;
    this.emit("hit", { key });
    
    return this.cache.get(key);
  }

  /**
   * Delete cache item
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.accessOrder.delete(key);
      this.expirations.delete(key);
      this.stats.deletes++;
      this.emit("delete", { key });
    }
    return deleted;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key) {
    if (!this.cache.has(key)) return false;
    if (this.isExpired(key)) {
      this.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Check if item is expired
   */
  isExpired(key) {
    if (!this.expirations.has(key)) return false;
    return Date.now() > this.expirations.get(key);
  }

  /**
   * Evict least recently used item
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, time] of this.accessOrder.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
      this.stats.evictions++;
      this.emit("evict", { key: oldestKey });
    }
  }

  /**
   * Clean up expired items
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, expiration] of this.expirations.entries()) {
      if (now > expiration) {
        this.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.emit("cleanup", { cleaned });
    }
    
    return cleaned;
  }

  /**
   * Get or set with a factory function
   */
  async getOrSet(key, factory, ttl = this.defaultTTL) {
    const cached = this.get(key);
    if (cached !== null) return cached;
    
    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Batch get multiple keys
   */
  mget(keys) {
    const results = {};
    for (const key of keys) {
      const value = this.get(key);
      if (value !== null) {
        results[key] = value;
      }
    }
    return results;
  }

  /**
   * Batch set multiple key-value pairs
   */
  mset(entries, ttl = this.defaultTTL) {
    for (const [key, value] of Object.entries(entries)) {
      this.set(key, value, ttl);
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.accessOrder.clear();
    this.expirations.clear();
    this.emit("clear", { size });
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0;
    
    return {
      ...this.stats,
      hitRate: (hitRate * 100).toFixed(2) + '%',
      size: this.cache.size,
      maxSize: this.maxSize,
      usage: ((this.cache.size / this.maxSize) * 100).toFixed(2) + '%'
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      expired: 0
    };
  }

  /**
   * Cleanup on destroy
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

module.exports = CacheProcessor;
