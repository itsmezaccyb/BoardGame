/**
 * Image list utilities for Chameleon
 */

export interface ImageListInfo {
  id: string;
  name: string;
  folder: string;
  description?: string;
  is_default: boolean;
  is_user_created: boolean;
}

/**
 * Fetch all available Chameleon image lists
 */
export async function getImageLists(): Promise<ImageListInfo[]> {
  try {
    console.log('🖼️ [Images API] Fetching image lists...');
    const response = await fetch('/api/chameleon/image-lists');
    const result = await response.json();

    console.log('🖼️ [Images API] Response:', { status: response.status, ok: response.ok, result });

    if (response.ok && result.lists) {
      console.log(`✅ [Images API] Loaded ${result.lists.length} image lists:`, result.lists);
      return result.lists;
    } else {
      console.error('❌ [Images API] Failed to fetch image lists:', result.error);
      return [];
    }
  } catch (error) {
    console.error('💥 [Images API] Error fetching image lists:', error);
    return [];
  }
}

/**
 * Load image paths from database for a specific variant
 */
export async function loadImageList(variant: string): Promise<string[]> {
  try {
    console.log(`🖼️ [Chameleon] Loading images for variant: ${variant}`);
    const response = await fetch(`/api/chameleon/images?variant=${encodeURIComponent(variant)}`);
    const result = await response.json();

    if (response.ok && result.images) {
      console.log(`✅ [Chameleon] Loaded ${result.images.length} images`);
      return result.images;
    } else {
      console.error('❌ [Chameleon] Failed to load images:', result.error);
      return [];
    }
  } catch (error) {
    console.error('💥 [Chameleon] Error loading images:', error);
    return [];
  }
}
