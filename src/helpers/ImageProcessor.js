/**
 * Image Processing Utility (Simplified - Canvas disabled)
 * Note: Canvas functionality disabled due to build dependencies
 */
class ImageProcessor {
  async processForPFP(imageUrl, size = 512) {
    // Return image URL directly without processing
    return imageUrl;
  }

  async processForBanner(imageUrl, width = 1024, height = 512) {
    // Return image URL directly without processing
    return imageUrl;
  }

  async loadImage(imageUrl) {
    // Return image object metadata
    return { url: imageUrl };
  }
}

module.exports = new ImageProcessor();
