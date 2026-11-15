import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db as supabase } from '@/lib/doodle/db';
import { generateCode } from '@/lib/doodle/game';
import { ApiError, handle } from '@/lib/doodle/server';

export const dynamic = 'force-dynamic';

// POST /api/doodle-relay/sessions  { playerName? }
// Creates a game. With a playerName the creator joins as leader; without one
// (e.g. a TV showing the table view) nobody joins yet.
export async function POST(request: NextRequest) {
  return handle(async () => {
    const { playerName } = await request.json().catch(() => ({}));
    const name = typeof playerName === 'string' ? playerName.trim().slice(0, 24) : '';

    let session: { id: string; session_code: string } | null = null;
    for (let attempt = 0; attempt < 5 && !session; attempt++) {
      const { data, error } = await supabase
        .from('doodle_sessions')
        .insert({ session_code: generateCode() })
        .select('id, session_code')
        .single();
      if (!error) session = data;
      else if (error.code !== '23505') throw error; // 23505 = code already taken
    }
    if (!session) throw new ApiError(500, 'Could not create a game, try again');

    if (!name) return NextResponse.json({ code: session.session_code });

    const token = randomUUID();
    const { error } = await supabase.from('doodle_players').insert({
      session_id: session.id,
      player_name: name,
      player_token: token,
      join_order: 1,
      is_leader: true,
    });
    if (error) throw error;
    return NextResponse.json({ code: session.session_code, token });
  });
}
