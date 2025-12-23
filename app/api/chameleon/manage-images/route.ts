import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/chameleon/manage-images?listId=<uuid> - Fetch images for a specific list
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId');

    if (!listId) {
      return NextResponse.json({ error: 'listId parameter is required' }, { status: 400 });
    }

    console.log(`🖼️ [Manage Images API] Loading images for list: ${listId}`);

    const { data: images, error } = await supabase
      .from('chameleon_images')
      .select('id, image_path, original_filename')
      .eq('image_list_id', listId)
      .order('original_filename', { ascending: true });

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

// DELETE /api/chameleon/manage-images?listId=<uuid>&imageId=<uuid> - Remove image from list
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId');
    const imageId = searchParams.get('imageId');

    if (!listId || !imageId) {
      return NextResponse.json({ error: 'listId and imageId parameters are required' }, { status: 400 });
    }

    console.log(`🗑️ [Manage Images API] Removing image: ${imageId}`);

    // First, get the image path to delete from storage
    const { data: imageData, error: fetchError } = await supabase
      .from('chameleon_images')
      .select('image_path')
      .eq('id', imageId)
      .eq('image_list_id', listId)
      .single();

    if (fetchError) {
      console.error('❌ [Manage Images API] Failed to fetch image:', fetchError);
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('chameleon_images')
      .delete()
      .eq('id', imageId)
      .eq('image_list_id', listId);

    if (deleteError) {
      console.error('❌ [Manage Images API] Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to remove image' }, { status: 500 });
    }

    // Try to delete from storage (non-blocking)
    if (imageData?.image_path) {
      // Extract bucket and path from full URL or path
      try {
        const url = new URL(imageData.image_path);
        const pathParts = url.pathname.split('/');
        const bucketIndex = pathParts.indexOf('chameleon-images');
        if (bucketIndex !== -1) {
          const filePath = pathParts.slice(bucketIndex + 1).join('/');
          await supabase.storage.from('chameleon-images').remove([filePath]);
          console.log(`✅ [Manage Images API] Deleted file from storage: ${filePath}`);
        }
      } catch (error) {
        console.warn('⚠️ [Manage Images API] Could not delete file from storage (non-blocking)');
      }
    }

    console.log(`✅ [Manage Images API] Removed image: ${imageId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('💥 [Manage Images API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
