import { NextRequest, NextResponse } from 'next/server';
import { db as supabase } from '@/lib/doodle/db';
import {
  bookForSeat,
  kindForStep,
  type EntryKind,
  type PublicPlayer,
  type RevealState,
  type StateResponse,
  type Task,
} from '@/lib/doodle/game';
import { handle, loadPlayers, loadSession, submittedThisRound } from '@/lib/doodle/server';

export const dynamic = 'force-dynamic';

// GET /api/doodle-relay/state?code=&token=
// Everything a screen needs, polled about once a second. Without a token
// (the table view) there is no personal task. Drawings are only referenced
// by id here; fetch them from /entry.
export async function GET(request: NextRequest) {
  return handle(async () => {
    const { searchParams } = new URL(request.url);
    const session = await loadSession(searchParams.get('code'));
    const token = searchParams.get('token');
    const rows = await loadPlayers(session.id);

    const inGame = session.status !== 'lobby';
    const submitted = session.status === 'playing' ? await submittedThisRound(session) : new Set<string>();
    const players: PublicPlayer[] = rows.map((p, i) => ({
      id: p.id,
      name: p.player_name,
      seat: inGame ? session.seat_order.indexOf(p.id) : i,
      isLeader: p.is_leader,
      submitted: submitted.has(p.id),
    }));
    const meRow = token ? rows.find((r) => r.player_token === token) : undefined;
    const me = meRow ? players.find((p) => p.id === meRow.id) || null : null;
    const nameOf = (id: string | null) => rows.find((r) => r.id === id)?.player_name ?? null;

    let task: Task | null = null;
    if (session.status === 'playing' && me && me.seat >= 0) {
      const n = session.seat_order.length;
      const book = bookForSeat(me.seat, session.round, n);
      const kind = kindForStep(session.round) as 'drawing' | 'guess';
      // Drawing rounds read the previous text; guess rounds the previous drawing
      const { data: source, error } = await supabase
        .from('doodle_entries')
        .select(kind === 'drawing' ? 'id, content' : 'id')
        .eq('session_id', session.id)
        .eq('game_number', session.game_number)
        .eq('book_index', book)
        .eq('step', session.round - 1)
        .maybeSingle();
      if (error) throw error;
      const src = source as { id: string; content?: string } | null;
      task = {
        kind,
        round: session.round,
        book,
        text: kind === 'drawing' ? src?.content : undefined,
        drawingEntryId: kind === 'guess' ? src?.id : undefined,
        submitted: me.submitted,
      };
    }

    let reveal: RevealState | null = null;
    if (session.status === 'reveal') {
      const { data: entries, error } = await supabase
        .from('doodle_entries')
        .select('id, step, kind, author_player_id')
        .eq('session_id', session.id)
        .eq('game_number', session.game_number)
        .eq('book_index', session.reveal_book)
        .order('step', { ascending: true });
      if (error) throw error;

      const textIds = (entries || []).filter((e) => e.kind !== 'drawing').map((e) => e.id);
      const texts = new Map<string, string>();
      if (textIds.length) {
        const { data: textRows, error: textError } = await supabase
          .from('doodle_entries')
          .select('id, content')
          .in('id', textIds);
        if (textError) throw textError;
        for (const t of textRows || []) texts.set(t.id, t.content);
      }

      reveal = {
        book: session.reveal_book,
        step: session.reveal_step,
        bookCount: session.seat_order.length,
        ownerName: nameOf(session.seat_order[session.reveal_book]) ?? 'Someone',
        steps: (entries || []).map((e) => ({
          entryId: e.id,
          step: e.step,
          kind: e.kind as EntryKind,
          authorName: nameOf(e.author_player_id),
          text: texts.get(e.id),
        })),
      };
    }

    const body: StateResponse = {
      code: session.session_code,
      status: session.status,
      gameNumber: session.game_number,
      round: session.round,
      totalRounds: session.total_rounds,
      timerSeconds: session.timer_seconds,
      roundStartedAt: session.round_started_at,
      serverNow: new Date().toISOString(),
      players,
      me,
      task,
      reveal,
    };
    return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
  });
}
