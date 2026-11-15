import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabase } from '@/lib/supabase';
import { MAX_PLAYERS } from '@/lib/doodle/game';
import { ApiError, handle, loadPlayers, loadSession, requirePlayer } from '@/lib/doodle/server';

export const dynamic = 'force-dynamic';

// POST /api/doodle-relay/players  { code, playerName }  → { code, token }
// Players who join mid-game sit out until the next game starts.
export async function POST(request: NextRequest) {
  return handle(async () => {
    const { code, playerName } = await request.json();
    const name = typeof playerName === 'string' ? playerName.trim().slice(0, 24) : '';
    if (!name) throw new ApiError(400, 'Enter your name');

    const session = await loadSession(code);
    const players = await loadPlayers(session.id);
    if (players.length >= MAX_PLAYERS) throw new ApiError(400, `Game is full (${MAX_PLAYERS} max)`);
    if (players.some((p) => p.player_name.toLowerCase() === name.toLowerCase())) {
      throw new ApiError(400, 'Someone already has that name');
    }

    const token = randomUUID();
    const joinOrder = (players[players.length - 1]?.join_order || 0) + 1;
    const { error } = await supabase.from('doodle_players').insert({
      session_id: session.id,
      player_name: name,
      player_token: token,
      join_order: joinOrder,
      is_leader: players.length === 0,
    });
    if (error) throw error;
    return NextResponse.json({ code: session.session_code, token });
  });
}

// DELETE /api/doodle-relay/players?code=&token=
export async function DELETE(request: NextRequest) {
  return handle(async () => {
    const { searchParams } = new URL(request.url);
    const session = await loadSession(searchParams.get('code'));
    const players = await loadPlayers(session.id);
    const me = requirePlayer(players, searchParams.get('token'));
    if (session.status === 'playing' && session.seat_order.includes(me.id)) {
      throw new ApiError(400, "You can't leave in the middle of a game");
    }

    const { error } = await supabase.from('doodle_players').delete().eq('id', me.id);
    if (error) throw error;

    if (me.is_leader) {
      const next = players.find((p) => p.id !== me.id);
      if (next) await supabase.from('doodle_players').update({ is_leader: true }).eq('id', next.id);
    }
    return NextResponse.json({ success: true });
  });
}
