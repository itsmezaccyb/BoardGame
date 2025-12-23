-- Create chameleon_word_lists table
CREATE TABLE IF NOT EXISTS chameleon_word_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL UNIQUE,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chameleon_word_lists_name ON chameleon_word_lists(name);

ALTER TABLE chameleon_word_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to chameleon_word_lists"
  ON chameleon_word_lists FOR ALL USING (true) WITH CHECK (true);

-- Create chameleon_words table
CREATE TABLE IF NOT EXISTS chameleon_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word_list_id UUID NOT NULL REFERENCES chameleon_word_lists(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(word_list_id, word)
);

CREATE INDEX IF NOT EXISTS idx_chameleon_words_word_list_id ON chameleon_words(word_list_id);
CREATE INDEX IF NOT EXISTS idx_chameleon_words_word ON chameleon_words(word);

ALTER TABLE chameleon_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to chameleon_words"
  ON chameleon_words FOR ALL USING (true) WITH CHECK (true);

-- Create chameleon_image_lists table
CREATE TABLE IF NOT EXISTS chameleon_image_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  folder TEXT NOT NULL UNIQUE,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_user_created BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chameleon_image_lists_name ON chameleon_image_lists(name);

ALTER TABLE chameleon_image_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to chameleon_image_lists"
  ON chameleon_image_lists FOR ALL USING (true) WITH CHECK (true);

-- Create chameleon_images table
CREATE TABLE IF NOT EXISTS chameleon_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_list_id UUID NOT NULL REFERENCES chameleon_image_lists(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  original_filename TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(image_list_id, image_path)
);

CREATE INDEX IF NOT EXISTS idx_chameleon_images_image_list_id ON chameleon_images(image_list_id);
CREATE INDEX IF NOT EXISTS idx_chameleon_images_image_path ON chameleon_images(image_path);

ALTER TABLE chameleon_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to chameleon_images"
  ON chameleon_images FOR ALL USING (true) WITH CHECK (true);

-- Create chameleon_game_sessions table
CREATE TABLE IF NOT EXISTS chameleon_game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_code TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL CHECK (mode IN ('word', 'image')),
  variant TEXT NOT NULL,
  game_state JSONB DEFAULT '{}',
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chameleon_game_sessions_session_code ON chameleon_game_sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_chameleon_game_sessions_status ON chameleon_game_sessions(status);

ALTER TABLE chameleon_game_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to chameleon_game_sessions"
  ON chameleon_game_sessions FOR ALL USING (true) WITH CHECK (true);

-- Create chameleon_players table
CREATE TABLE IF NOT EXISTS chameleon_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES chameleon_game_sessions(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_id TEXT NOT NULL UNIQUE,
  join_order INTEGER NOT NULL,
  is_leader BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, join_order)
);

CREATE INDEX IF NOT EXISTS idx_chameleon_players_session_id ON chameleon_players(session_id);
CREATE INDEX IF NOT EXISTS idx_chameleon_players_player_id ON chameleon_players(player_id);

ALTER TABLE chameleon_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to chameleon_players"
  ON chameleon_players FOR ALL USING (true) WITH CHECK (true);
