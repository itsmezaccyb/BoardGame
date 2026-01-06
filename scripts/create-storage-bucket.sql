-- Create Supabase Storage bucket for user-uploaded images
-- Run this in your Supabase SQL editor

-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('codenames-images', 'codenames-images', true);

-- Set up RLS policies for the bucket
CREATE POLICY "Allow public read access to codenames-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'codenames-images');

CREATE POLICY "Allow authenticated users to upload to codenames-images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'codenames-images');

CREATE POLICY "Allow users to update their own uploads" ON storage.objects
  FOR UPDATE USING (bucket_id = 'codenames-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to delete their own uploads" ON storage.objects
  FOR DELETE USING (bucket_id = 'codenames-images' AND auth.uid()::text = (storage.foldername(name))[1]);

