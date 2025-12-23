/**
 * Image list management for Codenames
 * Uses Supabase database instead of static files
 */

import { supabase, type ImageList, type Image } from '../supabase';

export interface ImageListInfo {
  name: string;
  folder: string;
  description?: string;
  is_default?: boolean;
  is_user_created?: boolean;
}

/**
 * Get list of available image lists from Supabase
 */
export async function getImageLists(): Promise<ImageListInfo[]> {
  try {
    const { data, error } = await supabase
      .from('image_lists')
      .select('name, folder, description, is_default, is_user_created')
      .order('is_user_created', { ascending: false }) // Show user-created first
      .order('name');

    if (error) {
      console.error('Error fetching image lists:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching image lists:', error);
    return [];
  }
}

/**
 * Load image paths from an image list in Supabase
 * @param folder - Name of the image list folder
 */
export async function loadImageList(folder: string): Promise<string[]> {
  try {
    // First get the image list ID
    const { data: imageList, error: listError } = await supabase
      .from('image_lists')
      .select('id')
      .eq('folder', folder)
      .single();

    if (listError || !imageList) {
      console.error('Image list not found:', folder);
      return [];
    }

    // Then get all image paths for this list
    const { data: images, error: imagesError } = await supabase
      .from('images')
      .select('image_path')
      .eq('image_list_id', imageList.id)
      .order('image_path');

    if (imagesError) {
      console.error('Error fetching images:', imagesError);
      return [];
    }

    return (images || []).map(img => img.image_path);
  } catch (error) {
    console.error('Error loading image list:', error);
    return [];
  }
}

/**
 * Select 25 random image paths from an image list using seeded random
 * @param imagePaths - Array of available image paths
 * @param seed - Seed for random number generation
 */
export function selectImages(imagePaths: string[], seed: number): string[] {
  // Filter to only existing images (we'll need to check this on the client)
  // For now, assume we have enough images
  
  // Seeded random function (same as Catan)
  const seededRandom = (index: number) => {
    const x = Math.sin(seed + index) * 10000;
    return x - Math.floor(x);
  };

  // Shuffle array using seeded random
  const shuffled = [...imagePaths];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(i) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Return first 25 images
  return shuffled.slice(0, 25);
}

