-- Fix duplicate group names issue
-- Remove unique constraint on image_lists.name to allow duplicate names
-- The folder field remains unique as the primary identifier

-- Drop the unique constraint on name
ALTER TABLE image_lists DROP CONSTRAINT IF EXISTS image_lists_name_key;

-- Add an index on name for performance (but not unique)
DROP INDEX IF EXISTS idx_image_lists_name;
CREATE INDEX IF NOT EXISTS idx_image_lists_name ON image_lists(name);

-- Add a partial unique index to prevent duplicate folders
CREATE UNIQUE INDEX IF NOT EXISTS idx_image_lists_folder_unique ON image_lists(folder);
