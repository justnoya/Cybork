/**
 * High-Performance Data Processing Utilities
 * Optimized batch operations for handling large-scale data
 */
class DataProcessor {
  /**
   * Batch process array with chunking to prevent blocking
   */
  static async batchProcess(items, processor, options = {}) {
    const chunkSize = options.chunkSize || 100;
    const concurrent = options.concurrent || 5;
    const delay = options.delay || 0;
    
    const results = [];
    const chunks = [];
    
    // Split into chunks
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }
    
    // Process chunks concurrently
    for (let i = 0; i < chunks.length; i += concurrent) {
      const batch = chunks.slice(i, i + concurrent);
      const batchResults = await Promise.all(
        batch.map(chunk => Promise.all(chunk.map(processor)))
      );
      results.push(...batchResults.flat());
      
      // Add delay between batches if specified
      if (delay > 0 && i + concurrent < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return results;
  }

  /**
   * Parallel map with concurrency limit
   */
  static async parallelMap(items, mapper, concurrencyLimit = 10) {
    const results = [];
    const executing = [];
    
    for (const [index, item] of items.entries()) {
      const promise = mapper(item, index).then(result => {
        results[index] = result;
      });
      
      executing.push(promise);
      
      if (executing.length >= concurrencyLimit) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }
    
    await Promise.all(executing);
    return results;
  }

  /**
   * Deduplicate array efficiently
   */
  static deduplicate(array, keyFn = item => item) {
    const seen = new Set();
    return array.filter(item => {
      const key = keyFn(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Group by key efficiently
   */
  static groupBy(array, keyFn) {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  }

  /**
   * Partition array based on predicate
   */
  static partition(array, predicate) {
    const pass = [];
    const fail = [];
    
    for (const item of array) {
      (predicate(item) ? pass : fail).push(item);
    }
    
    return [pass, fail];
  }

  /**
   * Efficient array intersection
   */
  static intersect(arr1, arr2) {
    const set2 = new Set(arr2);
    return arr1.filter(item => set2.has(item));
  }

  /**
   * Efficient array difference
   */
  static difference(arr1, arr2) {
    const set2 = new Set(arr2);
    return arr1.filter(item => !set2.has(item));
  }

  /**
   * Chunk array into smaller arrays
   */
  static chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Throttle function calls
   */
  static throttle(func, wait) {
    let timeout = null;
    let previous = 0;
    
    return function(...args) {
      const now = Date.now();
      const remaining = wait - (now - previous);
      
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        return func.apply(this, args);
      } else if (!timeout) {
        timeout = setTimeout(() => {
          previous = Date.now();
          timeout = null;
          func.apply(this, args);
        }, remaining);
      }
    };
  }

  /**
   * Debounce function calls
   */
  static debounce(func, wait) {
    let timeout;
    
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Retry operation with exponential backoff
   */
  static async retry(operation, options = {}) {
    const maxAttempts = options.maxAttempts || 3;
    const baseDelay = options.baseDelay || 1000;
    const maxDelay = options.maxDelay || 10000;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxAttempts) throw error;
        
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Measure execution time
   */
  static async measureTime(operation, label = "Operation") {
    const start = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - start;
      return { result, duration, label };
    } catch (error) {
      const duration = Date.now() - start;
      throw { error, duration, label };
    }
  }

  /**
   * Memory-efficient stream processing
   */
  static async* streamProcess(items, processor) {
    for (const item of items) {
      yield await processor(item);
    }
  }
}

module.exports = DataProcessor;
