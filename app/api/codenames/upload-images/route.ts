import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import heicConvert from 'heic-convert';

export async function POST(request: NextRequest) {
  console.log('🔄 [Upload API] Starting image upload request');

  try {
    console.log('📝 [Upload API] Parsing form data...');
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const mode = formData.get('mode') as 'new' | 'existing';
    const groupName = formData.get('groupName') as string;
    const groupId = formData.get('groupId') as string;

    console.log('📊 [Upload API] Request details:', {
      fileCount: files.length,
      mode,
      groupName: groupName || 'N/A',
      groupId: groupId || 'N/A',
      files: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
    });

    if (!files || files.length === 0) {
      console.log('❌ [Upload API] No files provided');
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    console.log('🔐 [Upload API] Initializing Supabase admin client...');
    // For now, we'll use a service role client for uploads
    // In production, you'd want proper user authentication
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('✅ [Upload API] Supabase client initialized');

    let imageGroup;

    if (mode === 'new') {
      console.log('🆕 [Upload API] Creating new image group...');
      if (!groupName) {
        console.log('❌ [Upload API] Group name is required for new mode');
        return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
      }

      // Create the image group
      const { data: newGroup, error: groupError } = await supabaseAdmin
        .from('image_lists')
        .insert({
          name: groupName,
          folder: `user-${Date.now()}`, // Generate unique folder name
          is_user_created: true,
          // created_by: userId, // Would come from authenticated user
        })
        .select()
        .single();

      if (groupError) {
        console.error('❌ [Upload API] Error creating image group:', groupError);

        // Provide specific error message for duplicate names
        if (groupError.code === '23505' && groupError.message.includes('image_lists_name_key')) {
          return NextResponse.json({
            error: `Group name "${groupName}" already exists. Please choose a different name or add images to the existing group.`
          }, { status: 400 });
        }

        return NextResponse.json({ error: 'Failed to create image group' }, { status: 500 });
      }

      console.log('✅ [Upload API] Created new image group:', newGroup);
      imageGroup = newGroup;
    } else {
      console.log('📂 [Upload API] Finding existing image group...');
      if (!groupId) {
        console.log('❌ [Upload API] Group ID is required for existing mode');
        return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
      }

      // Get existing group
      const { data: existingGroup, error: groupError } = await supabaseAdmin
        .from('image_lists')
        .select('*')
        .eq('folder', groupId)
        .eq('is_user_created', true)
        .single();

      if (groupError || !existingGroup) {
        console.error('❌ [Upload API] Group not found:', { groupId, error: groupError });
        return NextResponse.json({ error: 'Group not found or not accessible' }, { status: 404 });
      }

      console.log('✅ [Upload API] Found existing image group:', existingGroup);
      imageGroup = existingGroup;
    }

    const uploadedImages = [];
    const folderName = imageGroup.folder;

    console.log(`📤 [Upload API] Starting upload of ${files.length} files to folder: ${folderName}`);

    // Upload each image to Supabase Storage
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📸 [Upload API] Processing file ${i + 1}/${files.length}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

      try {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
        if (!allowedTypes.includes(file.type)) {
          console.warn(`⚠️ [Upload API] Skipping file ${file.name}: unsupported type ${file.type}`);
          continue;
        }

        // Convert HEIC files to JPEG
        let processedFile = file;
        if (file.type === 'image/heic' || file.type === 'image/heif') {
          console.log(`🔄 [Upload API] Converting HEIC to JPEG: ${file.name}`);
          try {
            const arrayBuffer = await file.arrayBuffer();
            const convertedBuffer = await heicConvert({
              buffer: Buffer.from(arrayBuffer),
              format: 'JPEG',
              quality: 0.9
            });
            processedFile = new File([convertedBuffer], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
              type: 'image/jpeg',
              lastModified: file.lastModified
            });
            console.log(`✅ [Upload API] Converted ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`);
          } catch (error) {
            console.warn(`⚠️ [Upload API] Failed to convert HEIC ${file.name}:`, error.message);
            continue;
          }
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (processedFile.size > maxSize) {
          console.warn(`⚠️ [Upload API] Skipping file ${file.name}: too large (${(processedFile.size / 1024 / 1024).toFixed(2)}MB)`);
          continue;
        }

        console.log(`🔄 [Upload API] Uploading ${processedFile.name} to storage...`);

        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const extension = processedFile.name.split('.').pop();
        const filename = `${timestamp}_${randomId}.${extension}`;

        // Upload to Supabase Storage
        const filePath = `user-uploads/${folderName}/${filename}`;
        console.log(`📁 [Upload API] Storage path: ${filePath}`);

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('codenames-images')
          .upload(filePath, processedFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error(`❌ [Upload API] Storage upload failed for ${file.name}:`, uploadError);

          // Provide specific error message for missing bucket
          if (uploadError.message.includes('Bucket not found')) {
            console.error('💡 [Upload API] The codenames-images bucket does not exist in Supabase Storage');
            console.error('🔧 [Upload API] Please create it in your Supabase dashboard under Storage');
          }

          continue;
        }

        console.log(`✅ [Upload API] Storage upload successful for ${file.name}`);

        // Get public URL
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('codenames-images')
          .getPublicUrl(filePath);

        console.log(`🔗 [Upload API] Public URL: ${publicUrlData.publicUrl}`);

        // Store image metadata in database
        console.log(`💾 [Upload API] Saving ${file.name} metadata to database...`);

        const { data: imageRecord, error: dbError } = await supabaseAdmin
          .from('images')
          .insert({
            image_list_id: imageGroup.id,
            image_path: publicUrlData.publicUrl,
            original_filename: file.name,
            file_size: file.size,
            mime_type: file.type,
            // uploaded_by: userId, // Would come from authenticated user
          })
          .select()
          .single();

        if (dbError) {
          console.error(`❌ [Upload API] Database insert failed for ${file.name}:`, dbError);
          // Try to delete the uploaded file since DB insert failed
          console.log(`🗑️ [Upload API] Cleaning up storage file due to DB error...`);
          await supabaseAdmin.storage
            .from('codenames-images')
            .remove([filePath]);
          continue;
        }

        console.log(`✅ [Upload API] Database save successful for ${file.name}`);
        uploadedImages.push(imageRecord);
      } catch (error) {
        console.error(`❌ [Upload API] Unexpected error processing ${file.name}:`, error);
        continue;
      }
    }

    console.log(`🎉 [Upload API] Upload completed successfully!`);
    console.log(`📊 [Upload API] Final stats: ${uploadedImages.length}/${files.length} files uploaded`);

    return NextResponse.json({
      success: true,
      group: imageGroup,
      mode: mode,
      uploadedCount: uploadedImages.length,
      totalFiles: files.length,
      images: uploadedImages
    });

  } catch (error) {
    console.error('💥 [Upload API] Critical error in image upload:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
