-- Add support for user-uploaded images and image groups
-- Extend existing tables to support user-created content

-- Add columns to image_lists for user-created groups
ALTER TABLE image_lists
ADD COLUMN created_by UUID,
ADD COLUMN is_user_created BOOLEAN DEFAULT false,
ADD COLUMN group_name TEXT,
ADD COLUMN group_description TEXT;

-- Add columns to images for user-uploaded images
ALTER TABLE images
ADD COLUMN uploaded_by UUID,
ADD COLUMN original_filename TEXT,
ADD COLUMN file_size INTEGER,
ADD COLUMN mime_type TEXT,
ADD COLUMN uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create storage bucket for user-uploaded images (if not exists)
-- Note: This would typically be done via Supabase dashboard or API

-- Update RLS policies to allow users to manage their own content
DROP POLICY IF EXISTS "Allow public read access to image_lists" ON image_lists;
DROP POLICY IF EXISTS "Allow public read access to images" ON images;

-- Allow everyone to read all image lists and images (for game access)
CREATE POLICY "Allow public read access to image_lists" ON image_lists
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to images" ON images
  FOR SELECT USING (true);

-- Allow authenticated users to insert their own image groups and images
CREATE POLICY "Allow authenticated users to create image_lists" ON image_lists
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Allow authenticated users to create images" ON images
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- Allow users to update/delete their own content
CREATE POLICY "Allow users to update their own image_lists" ON image_lists
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Allow users to update their own images" ON images
  FOR UPDATE USING (auth.uid() = uploaded_by);

CREATE POLICY "Allow users to delete their own image_lists" ON image_lists
  FOR DELETE USING (auth.uid() = created_by);

CREATE POLICY "Allow users to delete their own images" ON images
  FOR DELETE USING (auth.uid() = uploaded_by);

-- Create an index for better performance on user content
CREATE INDEX IF NOT EXISTS idx_image_lists_created_by ON image_lists(created_by);
CREATE INDEX IF NOT EXISTS idx_image_lists_is_user_created ON image_lists(is_user_created);
CREATE INDEX IF NOT EXISTS idx_images_uploaded_by ON images(uploaded_by);

