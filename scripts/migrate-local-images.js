#!/usr/bin/env node

/**
 * Migrate local images to Supabase storage
 * Uploads all images from /public/images/ to Supabase and generates URL mapping
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

async function migrateImages() {
  console.log('🚀 Starting local image migration to Supabase...\n');

  const imagesDir = path.join(process.cwd(), 'public', 'images');
  const imageMapping = {};

  // Get all image files
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const files = fs.readdirSync(imagesDir, { recursive: true })
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });

  console.log(`Found ${files.length} image files to migrate\n`);

  for (const file of files) {
    try {
      const filePath = path.join(imagesDir, file);
      const relativePath = file.replace(/\\/g, '/'); // Normalize path separators
      const storagePath = `assets/${relativePath}`;

      console.log(`📤 Uploading: ${relativePath}`);

      // Read file as buffer
      const fileBuffer = await readFile(filePath);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('codenames-images')
        .upload(storagePath, fileBuffer, {
          cacheControl: '3600',
          upsert: true, // Overwrite if exists
          contentType: getContentType(path.extname(file))
        });

      if (error) {
        console.error(`❌ Failed to upload ${relativePath}:`, error.message);
        continue;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('codenames-images')
        .getPublicUrl(storagePath);

      // Store mapping
      const localPath = `/images/${relativePath}`;
      imageMapping[localPath] = publicUrlData.publicUrl;

      console.log(`✅ Uploaded: ${relativePath}`);

    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }

  // Generate TypeScript mapping file
  const mappingContent = `/**
 * Auto-generated mapping of local image paths to Supabase URLs
 * Generated on: ${new Date().toISOString()}
 */

export const imageUrls: Record<string, string> = ${JSON.stringify(imageMapping, null, 2)};

// Helper function to get Supabase URL for local path
export function getImageUrl(localPath: string): string {
  return imageUrls[localPath] || localPath;
}
`;

  const mappingPath = path.join(process.cwd(), 'lib', 'image-mapping.ts');
  fs.writeFileSync(mappingPath, mappingContent);

  console.log(`\n📝 Generated image mapping file: ${mappingPath}`);
  console.log(`📊 Total images migrated: ${Object.keys(imageMapping).length}`);

  // Print summary
  console.log('\n📋 Migration Summary:');
  Object.entries(imageMapping).forEach(([local, supabase]) => {
    console.log(`  ${local} → ${supabase}`);
  });

  console.log('\n🎉 Migration completed! Update your code to use the new image URLs.');
}

function getContentType(extension) {
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };
  return types[extension] || 'application/octet-stream';
}

migrateImages().catch(console.error);
