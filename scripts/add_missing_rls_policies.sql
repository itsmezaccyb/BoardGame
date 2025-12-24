-- Add missing RLS policies for word and image list management
-- Run this in your Supabase SQL editor

-- Word lists policies (codenames)
CREATE POLICY "Allow public write access to word_lists" ON word_lists
  FOR ALL USING (true);

CREATE POLICY "Allow public write access to words" ON words
  FOR ALL USING (true);

-- Image lists policies (codenames)
CREATE POLICY "Allow public write access to image_lists" ON image_lists
  FOR ALL USING (true);

CREATE POLICY "Allow public write access to images" ON images
  FOR ALL USING (true);

-- Chameleon tables (if needed - they should already have proper policies)
-- These are already set up in migration 0008 and updated in 0009
