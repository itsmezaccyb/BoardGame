import { NextRequest, NextResponse } from 'next/server';
import { db as supabase } from '@/lib/doodle/db';
import { MAX_PROMPT_CHARS, NO_GUESS, bookForSeat, kindForStep, pickPrompts } from '@/lib/doodle/game';
import { promptsFor } from '@/lib/doodle/prompts';
import { ApiError, advanceIfComplete, handle, loadPlayers, loadSession, requirePlayer } from '@/lib/doodle/server';

export const dynamic = 'force-dynamic';

const MAX_DRAWING_CHARS = 1_500_000; // ~1.1 MB JPEG, far above a 640px sketch

// POST /api/doodle-relay/submit  { code, token, round, content }
export async function POST(request: NextRequest) {
  return handle(async () => {
    const { code, token, round, content } = await request.json();
    const session = await loadSession(code);
    const players = await loadPlayers(session.id);
    const me = requirePlayer(players, token);

    if (session.status !== 'playing') throw new ApiError(400, 'No round is running');
    // A late auto-submit from the previous round is quietly ignored
    if (round !== session.round) return NextResponse.json({ success: true, stale: true });

    const seat = session.seat_order.indexOf(me.id);
    if (seat < 0) throw new ApiError(400, "You're sitting out this game");

    const kind = kindForStep(session.round);
    let value = typeof content === 'string' ? content : '';
    if (kind === 'prompt') {
      value = value.trim().slice(0, MAX_PROMPT_CHARS) || pickPrompts(promptsFor(undefined), 1)[0];
    } else if (kind === 'guess') {
      value = value.trim().slice(0, 80) || NO_GUESS;
    } else if (value && (!value.startsWith('data:image/') || value.length > MAX_DRAWING_CHARS)) {
      throw new ApiError(400, 'That drawing could not be saved');
    }

    const { error } = await supabase.from('doodle_entries').upsert(
      {
        session_id: session.id,
        game_number: session.game_number,
        book_index: bookForSeat(seat, session.round, session.seat_order.length),
        step: session.round,
        kind,
        author_player_id: me.id,
        content: value,
      },
      { onConflict: 'session_id,game_number,book_index,step', ignoreDuplicates: true },
    );
    if (error) throw error;

    await advanceIfComplete(session);
    return NextResponse.json({ success: true });
  });
}
