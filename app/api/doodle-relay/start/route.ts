import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { MIN_PLAYERS, TIMER_OPTIONS, pickPrompts, totalRounds } from '@/lib/doodle/game';
import { PROMPTS } from '@/lib/doodle/prompts';
import { ApiError, handle, loadPlayers, loadSession, requireLeader } from '@/lib/doodle/server';

export const dynamic = 'force-dynamic';

// POST /api/doodle-relay/start  { code, token, timerSeconds }
// Starts a game from the lobby, or a new game after a reveal.
export async function POST(request: NextRequest) {
  return handle(async () => {
    const { code, token, timerSeconds } = await request.json();
    const session = await loadSession(code);
    const players = await loadPlayers(session.id);
    requireLeader(players, token);

    if (session.status === 'playing') throw new ApiError(400, 'A game is already running');
    if (players.length < MIN_PLAYERS) throw new ApiError(400, `Need at least ${MIN_PLAYERS} players`);

    const timer = (TIMER_OPTIONS as readonly number[]).includes(timerSeconds) ? timerSeconds : session.timer_seconds;
    const gameNumber = session.game_number + 1;
    const seatOrder = players.map((p) => p.id);
    const prompts = pickPrompts(PROMPTS, seatOrder.length);

    // Write the prompts before flipping the session to playing, so no one
    // ever sees a round without its starting words.
    const { error: entryError } = await supabase.from('doodle_entries').insert(
      prompts.map((text, book) => ({
        session_id: session.id,
        game_number: gameNumber,
        book_index: book,
        step: 0,
        kind: 'prompt',
        author_player_id: null,
        content: text,
      })),
    );
    if (entryError) throw entryError;

    const { data, error } = await supabase
      .from('doodle_sessions')
      .update({
        status: 'playing',
        game_number: gameNumber,
        round: 1,
        total_rounds: totalRounds(seatOrder.length),
        timer_seconds: timer,
        round_started_at: new Date().toISOString(),
        seat_order: seatOrder,
        reveal_book: 0,
        reveal_step: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id)
      .eq('game_number', session.game_number)
      .select('id');
    if (error) throw error;
    if (!data?.length) throw new ApiError(409, 'The game was already started');

    return NextResponse.json({ success: true });
  });
}
