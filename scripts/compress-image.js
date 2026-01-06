#!/usr/bin/env node

/**
 * Standalone image compression utility
 * Compresses images over a specified size threshold
 * Usage: node scripts/compress-image.js <input-file> <output-file> [max-size-mb] [quality]
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

async function compressImage(inputPath, outputPath, maxSizeMB = 10, quality = 0.8) {
  try {
    console.log(`Loading image: ${inputPath}`);

    const img = await loadImage(inputPath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');

    // Calculate new dimensions (max 1920px on longest side for quality)
    const maxDimension = 1920;
    let { width, height } = img;

    if (width > height) {
      if (width > maxDimension) {
        height = (height * maxDimension) / width;
        width = maxDimension;
      }
    } else {
      if (height > maxDimension) {
        width = (width * maxDimension) / height;
        height = maxDimension;
      }
    }

    // Resize canvas if needed
    if (width !== img.width || height !== img.height) {
      canvas.width = width;
      canvas.height = height;
      console.log(`Resizing: ${img.width}x${img.height} → ${width}x${height}`);
    }

    // Draw image
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to buffer
    const buffer = canvas.toBuffer('image/jpeg', { quality });

    // Write output
    fs.writeFileSync(outputPath, buffer);

    const inputSize = fs.statSync(inputPath).size;
    const outputSize = fs.statSync(outputPath).size;

    console.log(`✅ Compressed: ${(inputSize / 1024 / 1024).toFixed(2)}MB → ${(outputSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`📁 Saved to: ${outputPath}`);

    return {
      inputSize,
      outputSize,
      compressionRatio: outputSize / inputSize
    };

  } catch (error) {
    console.error('❌ Compression failed:', error.message);
    throw error;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node scripts/compress-image.js <input-file> <output-file> [max-size-mb] [quality]');
    console.log('Example: node scripts/compress-image.js input.jpg output.jpg 10 0.8');
    process.exit(1);
  }

  const [inputPath, outputPath, maxSizeMB = 10, quality = 0.8] = args;

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    process.exit(1);
  }

  compressImage(inputPath, outputPath, parseFloat(maxSizeMB), parseFloat(quality))
    .then(() => {
      console.log('🎉 Image compression completed!');
    })
    .catch(() => {
      process.exit(1);
    });
}

module.exports = { compressImage };

