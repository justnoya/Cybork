const axios = require("axios");
const CacheProcessor = require("./CacheProcessor");

/**
 * Advanced Web Search Processor
 * High-performance internet search with caching and rate limiting
 * Supports multiple search providers
 */
class SearchProcessor {
  constructor(options = {}) {
    this.cache = new CacheProcessor({
      maxSize: 1000,
      defaultTTL: 1800000 // 30 minutes
    });
    
    this.rateLimit = {
      maxRequests: options.maxRequests || 100,
      perMinute: options.perMinute || 60,
      requests: [],
    };
    
    this.timeout = options.timeout || 10000; // 10 seconds
    this.retryAttempts = options.retryAttempts || 3;
    
    // Statistics
    this.stats = {
      searches: 0,
      cached: 0,
      failed: 0,
      averageTime: 0
    };
  }

  /**
   * Check rate limit
   */
  checkRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old requests
    this.rateLimit.requests = this.rateLimit.requests.filter(time => time > oneMinuteAgo);
    
    if (this.rateLimit.requests.length >= this.rateLimit.perMinute) {
      const oldestRequest = Math.min(...this.rateLimit.requests);
      const waitTime = 60000 - (now - oldestRequest);
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }
    
    this.rateLimit.requests.push(now);
  }

  /**
   * Search with DuckDuckGo Instant Answer API (Free, no API key required)
   */
  async searchDuckDuckGo(query, options = {}) {
    const cacheKey = `ddg:${query}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.stats.cached++;
      return cached;
    }
    
    try {
      this.checkRateLimit();
      
      const startTime = Date.now();
      const response = await axios.get("https://api.duckduckgo.com/", {
        params: {
          q: query,
          format: "json",
          no_html: 1,
          skip_disambig: 1
        },
        timeout: this.timeout
      });
      
      const result = {
        query,
        answer: response.data.AbstractText || response.data.Answer,
        source: response.data.AbstractSource,
        url: response.data.AbstractURL,
        relatedTopics: response.data.RelatedTopics?.slice(0, 5) || [],
        timestamp: Date.now(),
        provider: "DuckDuckGo"
      };
      
      // Update stats
      const searchTime = Date.now() - startTime;
      this.stats.searches++;
      this.stats.averageTime = 
        (this.stats.averageTime * (this.stats.searches - 1) + searchTime) / this.stats.searches;
      
      // Cache the result
      this.cache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      this.stats.failed++;
      throw new Error(`DuckDuckGo search failed: ${error.message}`);
    }
  }

  /**
   * Search with Wikipedia API (Free, no API key required)
   */
  async searchWikipedia(query, options = {}) {
    const cacheKey = `wiki:${query}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.stats.cached++;
      return cached;
    }
    
    try {
      this.checkRateLimit();
      
      const startTime = Date.now();
      const response = await axios.get("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(query), {
        timeout: this.timeout
      });
      
      const result = {
        query,
        title: response.data.title,
        summary: response.data.extract,
        url: response.data.content_urls?.desktop?.page,
        thumbnail: response.data.thumbnail?.source,
        timestamp: Date.now(),
        provider: "Wikipedia"
      };
      
      // Update stats
      const searchTime = Date.now() - startTime;
      this.stats.searches++;
      this.stats.averageTime = 
        (this.stats.averageTime * (this.stats.searches - 1) + searchTime) / this.stats.searches;
      
      // Cache the result
      this.cache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      this.stats.failed++;
      throw new Error(`Wikipedia search failed: ${error.message}`);
    }
  }

  /**
   * Universal search - tries multiple providers
   */
  async search(query, options = {}) {
    const provider = options.provider || "auto";
    
    try {
      if (provider === "wikipedia" || provider === "auto") {
        return await this.searchWikipedia(query, options);
      }
      
      if (provider === "duckduckgo" || provider === "auto") {
        return await this.searchDuckDuckGo(query, options);
      }
      
      throw new Error("Unknown search provider");
    } catch (error) {
      // If auto mode and first provider fails, try alternative
      if (provider === "auto") {
        try {
          return await this.searchDuckDuckGo(query, options);
        } catch (secondError) {
          throw new Error(`All search providers failed: ${error.message}`);
        }
      }
      throw error;
    }
  }

  /**
   * Batch search multiple queries
   */
  async batchSearch(queries, options = {}) {
    const results = await Promise.allSettled(
      queries.map(query => this.search(query, options))
    );
    
    return results.map((result, index) => ({
      query: queries[index],
      success: result.status === "fulfilled",
      data: result.status === "fulfilled" ? result.value : null,
      error: result.status === "rejected" ? result.reason.message : null
    }));
  }

  /**
   * Get search statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheHitRate: this.stats.cached / (this.stats.searches + this.stats.cached) * 100 || 0,
      cacheStats: this.cache.getStats()
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      searches: 0,
      cached: 0,
      failed: 0,
      averageTime: 0
    };
  }
}

module.exports = SearchProcessor;
