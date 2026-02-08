import sharp from 'sharp';

/**
 * Optimizes an image buffer for web use.
 * - Resizes to a max dimension (default 1920px)
 * - Converts to WebP
 * - Compresses with default quality (80)
 * 
 * @param {Buffer} buffer - The input image buffer
 * @param {Object} options - Optimization options
 * @param {number} options.maxWidth - Max width (default 1920)
 * @param {number} options.quality - WebP quality (default 80)
 * @returns {Promise<Buffer>} - The optimized image buffer
 */
export async function optimizeImage(buffer, options = {}) {
  const { maxWidth = 1920, quality = 80, format = 'webp' } = options;

  try {
    let pipeline = sharp(buffer)
      .resize({
        width: maxWidth,
        withoutEnlargement: true, // Don't scale up small images
        fit: 'inside', // Maintain aspect ratio
      });

    if (format === 'webp') {
      pipeline = pipeline.webp({ quality });
    } else if (format === 'png') {
      pipeline = pipeline.png({ quality: quality > 100 ? 100 : quality, compressionLevel: 9 });
    } else if (format === 'jpeg' || format === 'jpg') {
      pipeline = pipeline.jpeg({ quality });
    }

    return await pipeline.toBuffer();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Image optimization failed:', error);
    throw error;
  }
}
