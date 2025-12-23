-- Create game_sessions table for storing Codenames game state
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_code TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL CHECK (mode IN ('word', 'image')),
  variant TEXT NOT NULL,
  game_state JSONB DEFAULT '{}',
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for session code lookups
CREATE INDEX IF NOT EXISTS idx_game_sessions_session_code ON game_sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);

-- Enable Row Level Security
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access (for game functionality)
CREATE POLICY "Allow public access to game_sessions" ON game_sessions FOR ALL USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_game_sessions_updated_at
    BEFORE UPDATE ON game_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
