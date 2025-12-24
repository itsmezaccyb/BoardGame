import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/chameleon/manage-images?listId=<folder> - Fetch images for a specific list
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId');

    if (!listId) {
      return NextResponse.json({ error: 'listId parameter is required' }, { status: 400 });
    }

    console.log(`🖼️ [Manage Images API] Loading images for list: ${listId}`);

    // First get the image list by folder to get its ID
    const { data: imageList, error: listError } = await supabase
      .from('chameleon_image_lists')
      .select('id')
      .eq('folder', listId)
      .single();

    if (listError) {
      console.error('❌ [Manage Images API] Image list not found:', listError);
      return NextResponse.json({ error: 'Image list not found' }, { status: 404 });
    }

    const { data: images, error } = await supabase
      .from('chameleon_images')
      .select('id, image_path, original_filename, file_size, mime_type, created_at, uploaded_at')
      .eq('image_list_id', imageList.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [Manage Images API] Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
    }

    console.log(`✅ [Manage Images API] Loaded ${images?.length || 0} images`);
    return NextResponse.json({ images });
  } catch (error) {
    console.error('💥 [Manage Images API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/chameleon/manage-images?listId=<folder>&imageId=<uuid> - Remove image from list
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId');
    const imageId = searchParams.get('imageId');

    if (!listId || !imageId) {
      return NextResponse.json({ error: 'listId and imageId parameters are required' }, { status: 400 });
    }

    console.log(`🗑️ [Manage Images API] Removing image ${imageId} from list: ${listId}`);

    // Get the image list by folder to get its ID
    const { data: imageList, error: listError } = await supabase
      .from('chameleon_image_lists')
      .select('id')
      .eq('folder', listId)
      .single();

    if (listError) {
      console.error('❌ [Manage Images API] Image list not found:', listError);
      return NextResponse.json({ error: 'Image list not found' }, { status: 404 });
    }

    // First get the image path so we can delete from storage
    const { data: image, error: fetchError } = await supabase
      .from('chameleon_images')
      .select('image_path')
      .eq('id', imageId)
      .eq('image_list_id', imageList.id)
      .single();

    if (fetchError) {
      console.error('❌ [Manage Images API] Fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to find image' }, { status: 404 });
    }

    // Delete from storage
    console.log(`🗂️ [Manage Images API] Deleting from storage: ${image.image_path}`);
    const { error: storageError } = await supabase.storage
      .from('chameleon-images')
      .remove([image.image_path]);

    if (storageError) {
      console.error('❌ [Manage Images API] Storage delete error:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('chameleon_images')
      .delete()
      .eq('id', imageId)
      .eq('image_list_id', imageList.id); // Extra safety check

    if (dbError) {
      console.error('❌ [Manage Images API] Database delete error:', dbError);
      return NextResponse.json({ error: 'Failed to remove image from database' }, { status: 500 });
    }

    console.log(`✅ [Manage Images API] Removed image ${imageId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('💥 [Manage Images API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
