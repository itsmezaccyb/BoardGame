import { NextRequest, NextResponse } from 'next/server';
import { db as supabase } from '@/lib/doodle/db';
import { MIN_PLAYERS, TIMER_OPTIONS, totalRounds } from '@/lib/doodle/game';
import { ApiError, handle, loadPlayers, loadSession, requireLeader } from '@/lib/doodle/server';

export const dynamic = 'force-dynamic';

// POST /api/doodle-relay/start  { code, token, timerSeconds }
// Starts a game from the lobby, or a new game after a reveal. It opens on
// round 0, where everyone writes the word that starts their own sketchbook.
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

    const { data, error } = await supabase
      .from('doodle_sessions')
      .update({
        status: 'playing',
        game_number: gameNumber,
        round: 0,
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
