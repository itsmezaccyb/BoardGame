#!/usr/bin/env node

/**
 * Upload key game assets to Supabase storage
 * This script uploads the main game images used in the application
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { readFile } = require('fs/promises');

require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Key images that are used in the application (excluding Catan images which stay local)
const keyImages = [
  // Catan images stay local - commented out
  // 'catan_woods.png',
  // 'catan_sheep.png',
  // 'catan_wheat.png',
  // 'catan_rock.png',
  // 'catan_brick.png',
  // 'catan_desert.png',
  // 'catan_water.png',
  // 'catan_boat.png',

  // Other game images
  'ticket_to_ride.jpg',
  'Wood.jpg'
];

async function uploadAssets() {
  console.log('🚀 Uploading key game assets to Supabase...\n');

  const imagesDir = path.join(process.cwd(), 'public', 'images');
  const uploadedUrls = {};

  for (const imageName of keyImages) {
    try {
      const filePath = path.join(imagesDir, imageName);

      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${imageName} - file not found`);
        continue;
      }

      const storagePath = `assets/${imageName}`;

      console.log(`📤 Uploading: ${imageName}`);

      // Read file as buffer
      const fileBuffer = await readFile(filePath);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('codenames-images')
        .upload(storagePath, fileBuffer, {
          cacheControl: '3600',
          upsert: true, // Overwrite if exists
          contentType: getContentType(path.extname(imageName))
        });

      if (error) {
        console.error(`❌ Failed to upload ${imageName}:`, error.message);
        continue;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('codenames-images')
        .getPublicUrl(storagePath);

      uploadedUrls[imageName] = publicUrlData.publicUrl;
      console.log(`✅ Uploaded: ${imageName}`);

    } catch (error) {
      console.error(`❌ Error processing ${imageName}:`, error.message);
    }
  }

  // Update the mapping file with real URLs
  const mappingPath = path.join(process.cwd(), 'lib', 'image-mapping.ts');
  let mappingContent = fs.readFileSync(mappingPath, 'utf8');

  // Replace placeholder URLs with real ones
  Object.entries(uploadedUrls).forEach(([imageName, supabaseUrl]) => {
    const localPath = `/images/${imageName}`;
    const regex = new RegExp(`${localPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: \`\$\{SUPABASE_URL\}/storage/v1/object/public/codenames-images/assets/${imageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\``, 'g');
    mappingContent = mappingContent.replace(regex, `${localPath}: '${supabaseUrl}'`);
  });

  fs.writeFileSync(mappingPath, mappingContent);

  console.log('\n📝 Updated image mapping with real Supabase URLs');
  console.log(`📊 Total assets uploaded: ${Object.keys(uploadedUrls).length}`);

  console.log('\n🎉 Asset upload completed! Your app now uses Supabase images.');
}

function getContentType(extension) {
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  return types[extension] || 'application/octet-stream';
}

uploadAssets().catch(console.error);
