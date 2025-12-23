import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/chameleon/images?variant=<folder> - Get image paths from database for a variant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const variant = searchParams.get('variant');

    if (!variant) {
      return NextResponse.json({ error: 'Variant parameter is required' }, { status: 400 });
    }

    console.log(`🖼️ [Images API] Fetching images for variant: ${variant}`);

    // First, find the image list by folder name
    const { data: imageList, error: listError } = await supabase
      .from('chameleon_image_lists')
      .select('id')
      .eq('folder', variant)
      .single();

    if (listError) {
      console.error(`❌ [Images API] Image list not found: ${variant}`, listError);
      return NextResponse.json({ error: 'Image list not found' }, { status: 404 });
    }

    // Then fetch all image paths for this list
    const { data: images, error: imagesError } = await supabase
      .from('chameleon_images')
      .select('image_path')
      .eq('image_list_id', imageList.id)
      .order('image_path', { ascending: true });

    if (imagesError) {
      console.error('❌ [Images API] Database error:', imagesError);
      return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
    }

    const imagePaths = (images || []).map(i => i.image_path);
    console.log(`✅ [Images API] Fetched ${imagePaths.length} images for variant: ${variant}`);
    return NextResponse.json({ images: imagePaths });
  } catch (error) {
    console.error('💥 [Images API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
