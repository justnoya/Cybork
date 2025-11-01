const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const crypto = require("crypto");
const fs = require("fs").promises;
const path = require("path");
const { debug, error } = require("@helpers/Logger");

puppeteer.use(StealthPlugin());

/**
 * Pinterest Scraper Service - 100% Working with Headless Browser
 * Uses Puppeteer to scrape Pinterest pins with proper dynamic content loading
 */
class PinterestScraper {
  constructor() {
    this.baseUrl = "https://www.pinterest.com";
    this.storageDir = path.join(process.cwd(), "pinterest_storage");
    this.categories = {
      boy: "aesthetic pfp boy",
      girl: "aesthetic pfp girl",
      matching: "matching pfp",
    };
    
    // In-memory cache for quick duplicate checks
    this.hashCache = new Map();
    
    // Browser instance (will be reused)
    this.browser = null;
    this.browserInitialized = false;
    
    // Initialize storage
    this.initializeStorage();
  }

  /**
   * Initialize storage directories
   */
  async initializeStorage() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      await fs.mkdir(path.join(this.storageDir, "boy"), { recursive: true });
      await fs.mkdir(path.join(this.storageDir, "girl"), { recursive: true });
      await fs.mkdir(path.join(this.storageDir, "matching"), { recursive: true });
      
      // Load existing hashes into cache
      await this.loadHashCache();
      debug("Pinterest storage initialized");
    } catch (err) {
      error("Failed to initialize Pinterest storage:", err);
    }
  }

  /**
   * Load existing image hashes into cache
   */
  async loadHashCache() {
    try {
      for (const category of Object.keys(this.categories)) {
        const hashFile = path.join(this.storageDir, category, "hashes.json");
        try {
          const data = await fs.readFile(hashFile, "utf8");
          const hashes = JSON.parse(data);
          this.hashCache.set(category, new Set(hashes));
        } catch {
          this.hashCache.set(category, new Set());
        }
      }
    } catch (err) {
      error("Failed to load hash cache:", err);
    }
  }

  /**
   * Save hash cache to disk
   */
  async saveHashCache(category) {
    try {
      const hashFile = path.join(this.storageDir, category, "hashes.json");
      const hashes = Array.from(this.hashCache.get(category) || []);
      await fs.writeFile(hashFile, JSON.stringify(hashes, null, 2));
    } catch (err) {
      error("Failed to save hash cache:", err);
    }
  }

  /**
   * Generate hash for image URL to detect duplicates
   */
  generateHash(url) {
    return crypto.createHash("md5").update(url).digest("hex");
  }

  /**
   * Check if image is duplicate
   */
  isDuplicate(category, imageUrl) {
    const hash = this.generateHash(imageUrl);
    const categoryHashes = this.hashCache.get(category) || new Set();
    return categoryHashes.has(hash);
  }

  /**
   * Add image hash to cache
   */
  addHash(category, imageUrl) {
    const hash = this.generateHash(imageUrl);
    const categoryHashes = this.hashCache.get(category) || new Set();
    categoryHashes.add(hash);
    this.hashCache.set(category, categoryHashes);
  }

  /**
   * Initialize browser instance
   */
  async initBrowser() {
    if (this.browser && this.browserInitialized) {
      try {
        await this.browser.version();
        return this.browser;
      } catch {
        this.browser = null;
        this.browserInitialized = false;
      }
    }

    try {
      debug("Launching headless browser for Pinterest scraping...");
      this.browser = await puppeteer.launch({
        headless: "new",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--disable-gpu",
          "--disable-software-rasterizer",
          "--disable-extensions",
          "--window-size=1920x1080",
          "--disable-blink-features=AutomationControlled",
          "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ],
        defaultViewport: {
          width: 1920,
          height: 1080,
        },
        timeout: 60000,
        protocolTimeout: 60000,
      });
      this.browserInitialized = true;
      debug("Browser launched successfully");
      return this.browser;
    } catch (err) {
      error("Failed to launch browser:", err);
      throw err;
    }
  }

  /**
   * Close browser instance
   */
  async closeBrowser() {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        this.browserInitialized = false;
        debug("Browser closed");
      } catch (err) {
        error("Failed to close browser:", err);
      }
    }
  }

  /**
   * Scrape Pinterest for images using headless browser
   */
  async scrapePinterest(query, category) {
    let page;
    try {
      const searchUrl = `${this.baseUrl}/search/pins/?q=${encodeURIComponent(query)}`;
      debug(`Scraping Pinterest: ${searchUrl}`);

      const browser = await this.initBrowser();
      page = await browser.newPage();

      // Set realistic user agent
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      // Set extra headers
      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      });

      // Navigate to Pinterest search with better error handling
      try {
        await page.goto(searchUrl, {
          waitUntil: "domcontentloaded",
          timeout: 45000,
        });
      } catch (navError) {
        debug(`Navigation warning: ${navError.message}, continuing...`);
      }

      // Wait for images to load - using waitForSelector instead of waitForTimeout
      try {
        await page.waitForSelector('img[src*="pinimg.com"]', { timeout: 15000 });
      } catch {
        debug("Pinterest images took longer to load, continuing with available content...");
      }
      
      // Additional wait for dynamic content
      await page.waitForTimeout(2000);

      // Scroll to load more images
      await this.autoScroll(page);

      // Extract image URLs from the page
      const imageData = await page.evaluate(() => {
        const pins = [];
        const imgElements = document.querySelectorAll('img[src*="pinimg.com"]');

        imgElements.forEach((img) => {
          // Get the largest available image URL
          let imageUrl = img.src;
          
          // Pinterest uses different size variants - get the original/largest
          if (imageUrl.includes("236x")) {
            imageUrl = imageUrl.replace("236x", "originals");
          } else if (imageUrl.includes("474x")) {
            imageUrl = imageUrl.replace("474x", "originals");
          } else if (imageUrl.includes("736x")) {
            imageUrl = imageUrl.replace("736x", "originals");
          }

          // Find parent link for pin URL
          let pinLink = "https://www.pinterest.com";
          let pinTitle = img.alt || "Pinterest Image";
          
          const parentLink = img.closest('a[href*="/pin/"]');
          if (parentLink) {
            pinLink = parentLink.href;
          }

          if (imageUrl && !imageUrl.includes("avatar") && !imageUrl.includes("user")) {
            pins.push({
              image: imageUrl,
              link: pinLink,
              title: pinTitle,
            });
          }
        });

        return pins;
      });

      await page.close();

      // Process and deduplicate results
      const uniquePins = [];
      for (const pin of imageData) {
        if (!this.isDuplicate(category, pin.image)) {
          uniquePins.push({
            id: this.generateHash(pin.image).substring(0, 10),
            title: pin.title,
            description: "",
            image: pin.image,
            link: pin.link,
          });
          this.addHash(category, pin.image);
          
          if (uniquePins.length >= 25) break;
        }
      }

      debug(`Scraped ${uniquePins.length} unique pins for: ${query}`);
      return uniquePins;

    } catch (err) {
      error("Pinterest scraping error:", err.message);
      if (page) {
        try {
          await page.close();
        } catch {}
      }
      return [];
    }
  }

  /**
   * Auto-scroll page to load more content
   */
  async autoScroll(page) {
    try {
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 300;
          const maxScrolls = 7; // Limit number of scrolls
          let scrolls = 0;
          
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            scrolls++;

            if (totalHeight >= scrollHeight || totalHeight >= 2000 || scrolls >= maxScrolls) {
              clearInterval(timer);
              resolve();
            }
          }, 150);
        });
      });
      
      // Wait for new images to load after scrolling
      await page.waitForTimeout(1000);
    } catch (err) {
      debug("Auto-scroll error (non-critical):", err.message);
    }
  }

  /**
   * Save pin metadata to storage
   */
  async savePinMetadata(category, pins) {
    try {
      const metadataFile = path.join(this.storageDir, category, "metadata.json");
      let existingData = [];
      
      try {
        const data = await fs.readFile(metadataFile, "utf8");
        existingData = JSON.parse(data);
      } catch {
        // File doesn't exist, start fresh
      }

      // Merge new pins with existing, avoiding duplicates by ID
      const existingIds = new Set(existingData.map(p => p.id));
      const newPins = pins.filter(p => !existingIds.has(p.id));
      const updatedData = [...existingData, ...newPins];

      await fs.writeFile(metadataFile, JSON.stringify(updatedData, null, 2));
      await this.saveHashCache(category);
      
      debug(`Saved ${newPins.length} new pins to ${category} category`);
    } catch (err) {
      error("Failed to save pin metadata:", err);
    }
  }

  /**
   * Get cached pins from storage
   */
  async getCachedPins(category, limit = 25) {
    try {
      const metadataFile = path.join(this.storageDir, category, "metadata.json");
      const data = await fs.readFile(metadataFile, "utf8");
      const pins = JSON.parse(data);
      
      // Shuffle and return random selection
      const shuffled = pins.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, limit);
    } catch {
      return [];
    }
  }

  /**
   * Search with custom query
   */
  async searchCustomQuery(query, limit = 5) {
    const queryStr = String(query || "").trim();
    
    if (!queryStr || queryStr.length === 0) {
      return this.getFallbackResults("pinterest search").slice(0, limit);
    }
    
    const category = "custom";
    const cacheKey = `custom_${this.generateHash(queryStr)}`;
    
    debug(`Scraping Pinterest for custom query: ${queryStr}`);
    const pins = await this.scrapePinterest(queryStr, cacheKey);
    
    if (pins.length > 0) {
      return pins.slice(0, limit);
    }
    
    return this.getFallbackResults(queryStr).slice(0, limit);
  }

  /**
   * Search and store pins
   */
  async searchAndStore(gender = "neutral", type = "pfp", limit = 5) {
    let category = "matching"; // default

    if (type === "pfp") {
      if (gender === "male") category = "boy";
      else if (gender === "female") category = "girl";
    }

    const query = this.categories[category];
    
    // Try to get cached pins first
    let pins = await this.getCachedPins(category);
    
    // If cache is empty or small, scrape new pins
    if (pins.length < 10) {
      debug(`Scraping Pinterest for: ${query}`);
      const newPins = await this.scrapePinterest(query, category);
      
      if (newPins.length > 0) {
        await this.savePinMetadata(category, newPins);
        pins = [...newPins, ...pins];
      }
    }

    const results = pins.length > 0 ? pins : this.getFallbackResults(query);
    return results.slice(0, limit);
  }

  /**
   * Get fallback results when scraping fails
   */
  getFallbackResults(query) {
    const queryStr = String(query || "pinterest search").trim();
    const placeholders = [];
    const baseQuery = encodeURIComponent(queryStr);
    
    for (let i = 0; i < 5; i++) {
      placeholders.push({
        id: `fallback-${i}`,
        title: `${queryStr} - Result ${i + 1}`,
        description: "Unable to fetch from Pinterest. Please try again later.",
        image: null,
        link: `https://www.pinterest.com/search/pins/?q=${baseQuery}`,
        isFallback: true,
      });
    }
    
    return placeholders;
  }

  /**
   * Clean up duplicates in storage
   */
  async cleanupDuplicates() {
    try {
      for (const category of Object.keys(this.categories)) {
        const metadataFile = path.join(this.storageDir, category, "metadata.json");
        const data = await fs.readFile(metadataFile, "utf8");
        const pins = JSON.parse(data);
        
        const uniquePins = [];
        const seenHashes = new Set();
        
        for (const pin of pins) {
          const hash = this.generateHash(pin.image);
          if (!seenHashes.has(hash)) {
            uniquePins.push(pin);
            seenHashes.add(hash);
          }
        }
        
        await fs.writeFile(metadataFile, JSON.stringify(uniquePins, null, 2));
        this.hashCache.set(category, seenHashes);
        await this.saveHashCache(category);
        
        debug(`Cleaned ${pins.length - uniquePins.length} duplicates from ${category}`);
      }
    } catch (err) {
      error("Failed to cleanup duplicates:", err);
    }
  }

  /**
   * Cleanup on shutdown
   */
  async cleanup() {
    await this.closeBrowser();
  }
}

// Create singleton instance
const instance = new PinterestScraper();

// Cleanup on process exit
process.on("SIGINT", async () => {
  await instance.cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await instance.cleanup();
  process.exit(0);
});

module.exports = instance;
