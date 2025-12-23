-- Create image_lists table for storing Codenames image lists
CREATE TABLE IF NOT EXISTS image_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  folder TEXT NOT NULL UNIQUE,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create images table for storing individual image paths
CREATE TABLE IF NOT EXISTS images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_list_id UUID NOT NULL REFERENCES image_lists(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure no duplicate paths in the same list
  UNIQUE(image_list_id, image_path)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_images_image_list_id ON images(image_list_id);
CREATE INDEX IF NOT EXISTS idx_images_image_path ON images(image_path);
CREATE INDEX IF NOT EXISTS idx_image_lists_name ON image_lists(name);

-- Enable Row Level Security (RLS)
ALTER TABLE image_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (since this is game data)
CREATE POLICY "Allow public read access to image_lists" ON image_lists
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to images" ON images
  FOR SELECT USING (true);

-- Insert the default/sam image list
INSERT INTO image_lists (name, folder, description, is_default)
VALUES ('Sam''s Collection', 'sam', 'Personal image collection for Codenames', true);
