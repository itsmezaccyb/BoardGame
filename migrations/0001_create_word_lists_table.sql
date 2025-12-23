-- Create word_lists table for storing Codenames word lists
CREATE TABLE IF NOT EXISTS word_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL UNIQUE,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create words table for storing individual words
CREATE TABLE IF NOT EXISTS words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word_list_id UUID NOT NULL REFERENCES word_lists(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure no duplicate words in the same list
  UNIQUE(word_list_id, word)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_words_word_list_id ON words(word_list_id);
CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);
CREATE INDEX IF NOT EXISTS idx_word_lists_name ON word_lists(name);

-- Enable Row Level Security (RLS)
ALTER TABLE word_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (since this is game data)
CREATE POLICY "Allow public read access to word_lists" ON word_lists
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to words" ON words
  FOR SELECT USING (true);

-- Insert the default/standard word list
INSERT INTO word_lists (name, filename, description, is_default)
VALUES ('Standard', 'standard.md', 'Official Codenames word list', true);
