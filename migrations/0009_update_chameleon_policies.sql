-- Drop old policies and recreate with simplified public access

-- chameleon_word_lists
DROP POLICY IF EXISTS "Allow public read access to chameleon_word_lists" ON chameleon_word_lists;
DROP POLICY IF EXISTS "Allow public insert access to chameleon_word_lists" ON chameleon_word_lists;
DROP POLICY IF EXISTS "Allow public update access to chameleon_word_lists" ON chameleon_word_lists;
DROP POLICY IF EXISTS "Allow public delete access to chameleon_word_lists" ON chameleon_word_lists;
CREATE POLICY "Allow public access to chameleon_word_lists"
  ON chameleon_word_lists FOR ALL USING (true) WITH CHECK (true);

-- chameleon_words
DROP POLICY IF EXISTS "Allow public read access to chameleon_words" ON chameleon_words;
DROP POLICY IF EXISTS "Allow public insert access to chameleon_words" ON chameleon_words;
DROP POLICY IF EXISTS "Allow public update access to chameleon_words" ON chameleon_words;
DROP POLICY IF EXISTS "Allow public delete access to chameleon_words" ON chameleon_words;
CREATE POLICY "Allow public access to chameleon_words"
  ON chameleon_words FOR ALL USING (true) WITH CHECK (true);

-- chameleon_image_lists
DROP POLICY IF EXISTS "Allow public read access to chameleon_image_lists" ON chameleon_image_lists;
DROP POLICY IF EXISTS "Allow public insert access to chameleon_image_lists" ON chameleon_image_lists;
DROP POLICY IF EXISTS "Allow public update access to chameleon_image_lists" ON chameleon_image_lists;
DROP POLICY IF EXISTS "Allow public delete access to chameleon_image_lists" ON chameleon_image_lists;
CREATE POLICY "Allow public access to chameleon_image_lists"
  ON chameleon_image_lists FOR ALL USING (true) WITH CHECK (true);

-- chameleon_images
DROP POLICY IF EXISTS "Allow public read access to chameleon_images" ON chameleon_images;
DROP POLICY IF EXISTS "Allow public insert access to chameleon_images" ON chameleon_images;
DROP POLICY IF EXISTS "Allow public update access to chameleon_images" ON chameleon_images;
DROP POLICY IF EXISTS "Allow public delete access to chameleon_images" ON chameleon_images;
CREATE POLICY "Allow public access to chameleon_images"
  ON chameleon_images FOR ALL USING (true) WITH CHECK (true);

-- chameleon_game_sessions (already has the right policy, so just drop old one if needed)
DROP POLICY IF EXISTS "Allow public access to chameleon_game_sessions" ON chameleon_game_sessions;
CREATE POLICY "Allow public access to chameleon_game_sessions"
  ON chameleon_game_sessions FOR ALL USING (true) WITH CHECK (true);

-- chameleon_players (already has the right policy, so just drop old one if needed)
DROP POLICY IF EXISTS "Allow public access to chameleon_players" ON chameleon_players;
CREATE POLICY "Allow public access to chameleon_players"
  ON chameleon_players FOR ALL USING (true) WITH CHECK (true);
