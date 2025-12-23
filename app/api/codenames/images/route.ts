import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder');

    if (!folder) {
      return NextResponse.json({ error: 'Folder parameter required' }, { status: 400 });
    }

    // First get the image list ID
    const { data: imageList, error: listError } = await supabase
      .from('image_lists')
      .select('id')
      .eq('folder', folder)
      .single();

    if (listError || !imageList) {
      console.error('Image list not found:', folder);
      return NextResponse.json([]);
    }

    // Then get all image paths for this list
    const { data: images, error: imagesError } = await supabase
      .from('images')
      .select('image_path')
      .eq('image_list_id', imageList.id)
      .order('image_path');

    if (imagesError) {
      console.error('Error fetching images:', imagesError);
      return NextResponse.json([], { status: 500 });
    }

    return NextResponse.json((images || []).map(img => img.image_path));
  } catch (error) {
    console.error('Error reading images:', error);
    return NextResponse.json([], { status: 500 });
  }
}

