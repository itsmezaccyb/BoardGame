import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST /api/chameleon/upload-images - Upload images to a group
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const mode = formData.get('mode') as string;
    const groupName = formData.get('groupName') as string | null;
    const groupId = formData.get('groupId') as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (mode !== 'new' && mode !== 'existing') {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    console.log(`🚀 [Upload Images API] Starting upload: ${files.length} files, mode: ${mode}`);

    let listId: string;
    let folder: string;

    if (mode === 'new') {
      if (!groupName || groupName.trim().length === 0) {
        return NextResponse.json({ error: 'Group name is required for new groups' }, { status: 400 });
      }

      folder = groupName.toLowerCase().replace(/\s+/g, '_');

      console.log(`🆕 [Upload Images API] Creating new image list: ${groupName}`);

      const { data: newList, error: createError } = await supabase
        .from('chameleon_image_lists')
        .insert({
          name: groupName,
          folder: folder,
          is_user_created: true,
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ [Upload Images API] Failed to create list:', createError);
        if (createError.code === '23505') {
          return NextResponse.json({ error: 'A group with this name already exists' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to create image list' }, { status: 500 });
      }

      listId = newList.id;
    } else {
      if (!groupId) {
        return NextResponse.json({ error: 'Group ID is required for existing groups' }, { status: 400 });
      }

      console.log(`📂 [Upload Images API] Adding to existing group: ${groupId}`);

      const { data: existingList, error: fetchError } = await supabase
        .from('chameleon_image_lists')
        .select('id, folder')
        .eq('folder', groupId)
        .single();

      if (fetchError) {
        console.error('❌ [Upload Images API] Group not found:', fetchError);
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      }

      listId = existingList.id;
      folder = existingList.folder;
    }

    // Upload files to Supabase Storage
    let uploadedCount = 0;
    const failedFiles: string[] = [];

    for (const file of files) {
      try {
        console.log(`📎 [Upload Images API] Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

        // Create unique filename
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const ext = file.name.split('.').pop() || 'jpg';
        const storageName = `${timestamp}_${random}.${ext}`;
        const storagePath = `${folder}/${storageName}`;

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chameleon-images')
          .upload(storagePath, file);

        if (uploadError) {
          console.error(`❌ [Upload Images API] Upload failed for ${file.name}:`, uploadError);
          failedFiles.push(file.name);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('chameleon-images')
          .getPublicUrl(storagePath);

        // Save to database
        const { error: dbError } = await supabase
          .from('chameleon_images')
          .insert({
            image_list_id: listId,
            image_path: publicUrl,
            original_filename: file.name,
          });

        if (dbError) {
          console.error(`❌ [Upload Images API] Database insert failed for ${file.name}:`, dbError);
          failedFiles.push(file.name);
          continue;
        }

        uploadedCount++;
        console.log(`✅ [Upload Images API] Uploaded ${file.name}`);
      } catch (error) {
        console.error(`💥 [Upload Images API] Error uploading ${file.name}:`, error);
        failedFiles.push(file.name);
      }
    }

    console.log(`✅ [Upload Images API] Upload complete: ${uploadedCount}/${files.length} files`);

    return NextResponse.json({
      uploadedCount,
      totalFiles: files.length,
      failedFiles: failedFiles.length > 0 ? failedFiles : undefined,
    });
  } catch (error) {
    console.error('💥 [Upload Images API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
