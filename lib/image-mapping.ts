/**
 * Mapping of local image paths to Supabase storage URLs
 * Run `node scripts/upload-assets.js` to upload images and update these URLs automatically
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const imageUrls: Record<string, string> = {
  // Catan images
  '/images/catan_woods.png': SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/codenames-images/assets/catan_woods.png` : '/images/catan_woods.png',
  '/images/catan_sheep.png': SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/codenames-images/assets/catan_sheep.png` : '/images/catan_sheep.png',
  '/images/catan_wheat.png': SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/codenames-images/assets/catan_wheat.png` : '/images/catan_wheat.png',
  '/images/catan_rock.png': SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/codenames-images/assets/catan_rock.png` : '/images/catan_rock.png',
  '/images/catan_brick.png': SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/codenames-images/assets/catan_brick.png` : '/images/catan_brick.png',
  '/images/catan_desert.png': SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/codenames-images/assets/catan_desert.png` : '/images/catan_desert.png',
  '/images/catan_water.png': SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/codenames-images/assets/catan_water.png` : '/images/catan_water.png',
  '/images/catan_boat.png': SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/codenames-images/assets/catan_boat.png` : '/images/catan_boat.png',
  '/images/catan_4_.jpg': SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/codenames-images/assets/catan_4_.jpg` : '/images/catan_4_.jpg',
  '/images/catan_6_.jpeg': SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/codenames-images/assets/catan_6_.jpeg` : '/images/catan_6_.jpeg',

  // Ticket to Ride
  '/images/ticket_to_ride.jpg': SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/codenames-images/assets/ticket_to_ride.jpg` : '/images/ticket_to_ride.jpg',

  // Chess
  '/images/Wood.jpg': SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/codenames-images/assets/Wood.jpg` : '/images/Wood.jpg',

  // Other images (fallback to local if Supabase not configured)
  '/images/catan_boat_generic_3-1.png': SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/codenames-images/assets/catan_boat_generic_3-1.png` : '/images/catan_boat_generic_3-1.png',
  '/images/catan_boat_wheat_2-1.png': SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/codenames-images/assets/catan_boat_wheat_2-1.png` : '/images/catan_boat_wheat_2-1.png',
  '/images/catan_boat_wood_2-1.png': SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/codenames-images/assets/catan_boat_wood_2-1.png` : '/images/catan_boat_wood_2-1.png',
  '/images/catan_boat_brick_2-1.png': SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/codenames-images/assets/catan_boat_brick_2-1.png` : '/images/catan_boat_brick_2-1.png',
  '/images/catan_boat_rock_2-1.png': SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/codenames-images/assets/catan_boat_rock_2-1.png` : '/images/catan_boat_rock_2-1.png`,
  '/images/catan_boat_sheep_2-1.png': SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/codenames-images/assets/catan_boat_sheep_2-1.png` : '/images/catan_boat_sheep_2-1.png`,
  '/images/resources.png': SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/codenames-images/assets/resources.png` : '/images/resources.png`,
};

// Helper function to get Supabase URL for local path
export function getImageUrl(localPath: string): string {
  return imageUrls[localPath] || localPath;
}
