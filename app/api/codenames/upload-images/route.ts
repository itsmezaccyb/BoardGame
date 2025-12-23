import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const groupName = formData.get('groupName') as string;
    const groupDescription = formData.get('groupDescription') as string;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (!groupName) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    // For now, we'll use a service role client for uploads
    // In production, you'd want proper user authentication
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create the image group
    const { data: imageGroup, error: groupError } = await supabaseAdmin
      .from('image_lists')
      .insert({
        name: groupName,
        folder: `user-${Date.now()}`, // Generate unique folder name
        description: groupDescription,
        is_user_created: true,
        // created_by: userId, // Would come from authenticated user
      })
      .select()
      .single();

    if (groupError) {
      console.error('Error creating image group:', groupError);
      return NextResponse.json({ error: 'Failed to create image group' }, { status: 500 });
    }

    const uploadedImages = [];
    const folderName = imageGroup.folder;

    // Upload each image to Supabase Storage
    for (const file of files) {
      try {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          console.warn(`Skipping file ${file.name}: unsupported type ${file.type}`);
          continue;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          console.warn(`Skipping file ${file.name}: too large (${file.size} bytes)`);
          continue;
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const extension = file.name.split('.').pop();
        const filename = `${timestamp}_${randomId}.${extension}`;

        // Upload to Supabase Storage
        const filePath = `user-uploads/${folderName}/${filename}`;
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('codenames-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error(`Error uploading ${file.name}:`, uploadError);
          continue;
        }

        // Get public URL
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('codenames-images')
          .getPublicUrl(filePath);

        // Store image metadata in database
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
          console.error(`Error saving ${file.name} to database:`, dbError);
          // Try to delete the uploaded file since DB insert failed
          await supabaseAdmin.storage
            .from('codenames-images')
            .remove([filePath]);
          continue;
        }

        uploadedImages.push(imageRecord);
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      group: imageGroup,
      uploadedCount: uploadedImages.length,
      totalFiles: files.length,
      images: uploadedImages
    });

  } catch (error) {
    console.error('Error in image upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
