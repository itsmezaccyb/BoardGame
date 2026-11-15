-- Doodle Relay: draw-and-guess chain played on everyone's own device.

CREATE TABLE IF NOT EXISTS doodle_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'playing', 'reveal')),
  game_number INTEGER NOT NULL DEFAULT 0,
  round INTEGER NOT NULL DEFAULT 0,
  total_rounds INTEGER NOT NULL DEFAULT 0,
  timer_seconds INTEGER NOT NULL DEFAULT 90,
  round_started_at TIMESTAMP WITH TIME ZONE,
  -- Player ids (doodle_players.id) in seat order, fixed when a game starts
  seat_order JSONB NOT NULL DEFAULT '[]',
  reveal_book INTEGER NOT NULL DEFAULT 0,
  reveal_step INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doodle_sessions_code ON doodle_sessions(session_code);

CREATE TABLE IF NOT EXISTS doodle_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES doodle_sessions(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  -- Secret token kept on the player's device; identifies them to the API
  player_token TEXT NOT NULL UNIQUE,
  join_order INTEGER NOT NULL,
  is_leader BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doodle_players_session ON doodle_players(session_id);

CREATE TABLE IF NOT EXISTS doodle_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES doodle_sessions(id) ON DELETE CASCADE,
  game_number INTEGER NOT NULL,
  book_index INTEGER NOT NULL,
  step INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('prompt', 'drawing', 'guess')),
  author_player_id UUID REFERENCES doodle_players(id) ON DELETE SET NULL,
  -- Text for prompts/guesses, a JPEG data URL for drawings
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (session_id, game_number, book_index, step)
);

CREATE INDEX IF NOT EXISTS idx_doodle_entries_round ON doodle_entries(session_id, game_number, step);

ALTER TABLE doodle_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE doodle_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE doodle_entries ENABLE ROW LEVEL SECURITY;

-- Same open policy as the Chameleon tables: the Next.js API routes are the only client.
CREATE POLICY "Allow public access to doodle_sessions" ON doodle_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to doodle_players" ON doodle_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to doodle_entries" ON doodle_entries FOR ALL USING (true) WITH CHECK (true);
