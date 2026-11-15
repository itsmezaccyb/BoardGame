import { NextResponse } from 'next/server';
import { db as supabase } from '@/lib/doodle/db';
import { NO_GUESS, BLANK_DRAWING, kindForStep } from './game';

export interface SessionRow {
  id: string;
  session_code: string;
  status: 'lobby' | 'playing' | 'reveal';
  game_number: number;
  round: number;
  total_rounds: number;
  timer_seconds: number;
  round_started_at: string | null;
  seat_order: string[];
  reveal_book: number;
  reveal_step: number;
}

export interface PlayerRow {
  id: string;
  session_id: string;
  player_name: string;
  player_token: string;
  join_order: number;
  is_leader: boolean;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Wrap a route handler so thrown ApiErrors become JSON error responses. */
export function handle(fn: () => Promise<Response>): Promise<Response> {
  return fn().catch((err) => {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('💥 [Doodle Relay API]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  });
}

export async function loadSession(code: string | null | undefined): Promise<SessionRow> {
  if (!code) throw new ApiError(400, 'Game code is required');
  const { data, error } = await supabase
    .from('doodle_sessions')
    .select('*')
    .eq('session_code', code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, 'No game with that code');
  return data as SessionRow;
}

export async function loadPlayers(sessionId: string): Promise<PlayerRow[]> {
  const { data, error } = await supabase
    .from('doodle_players')
    .select('*')
    .eq('session_id', sessionId)
    .order('join_order', { ascending: true });
  if (error) throw error;
  return (data || []) as PlayerRow[];
}

export function requirePlayer(players: PlayerRow[], token: string | null | undefined): PlayerRow {
  const me = token ? players.find((p) => p.player_token === token) : undefined;
  if (!me) throw new ApiError(403, 'You are not in this game');
  return me;
}

export function requireLeader(players: PlayerRow[], token: string | null | undefined): PlayerRow {
  const me = requirePlayer(players, token);
  if (!me.is_leader) throw new ApiError(403, 'Only the leader can do that');
  return me;
}

/** Ids of players who have an entry for the current round. */
export async function submittedThisRound(session: SessionRow): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('doodle_entries')
    .select('author_player_id')
    .eq('session_id', session.id)
    .eq('game_number', session.game_number)
    .eq('step', session.round);
  if (error) throw error;
  return new Set((data || []).map((r) => r.author_player_id as string));
}

async function countThisRound(session: SessionRow): Promise<number> {
  const { count, error } = await supabase
    .from('doodle_entries')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', session.id)
    .eq('game_number', session.game_number)
    .eq('step', session.round);
  if (error) throw error;
  return count || 0;
}

/**
 * Move to the next round (or the reveal) once every book has an entry for
 * this round. The `round` guard makes concurrent calls advance only once.
 */
export async function advanceIfComplete(session: SessionRow): Promise<void> {
  if (session.status !== 'playing') return;
  const done = await countThisRound(session);
  if (done < session.seat_order.length) return;

  const update =
    session.round >= session.total_rounds
      ? { status: 'reveal', reveal_book: 0, reveal_step: 0, updated_at: new Date().toISOString() }
      : { round: session.round + 1, round_started_at: new Date().toISOString(), updated_at: new Date().toISOString() };

  const { error } = await supabase
    .from('doodle_sessions')
    .update(update)
    .eq('id', session.id)
    .eq('status', 'playing')
    .eq('round', session.round);
  if (error) throw error;
}

/** Fill in a placeholder for every seat that hasn't submitted, then advance. */
export async function fillMissingAndAdvance(session: SessionRow): Promise<void> {
  if (session.status !== 'playing') return;
  const submitted = await submittedThisRound(session);
  const n = session.seat_order.length;
  const kind = kindForStep(session.round);
  const rows = session.seat_order
    .map((playerId, seat) => ({ playerId, seat }))
    .filter(({ playerId }) => !submitted.has(playerId))
    .map(({ playerId, seat }) => ({
      session_id: session.id,
      game_number: session.game_number,
      book_index: (((seat - session.round) % n) + n) % n,
      step: session.round,
      kind,
      author_player_id: playerId,
      content: kind === 'guess' ? NO_GUESS : BLANK_DRAWING,
    }));
  if (rows.length > 0) {
    const { error } = await supabase
      .from('doodle_entries')
      .upsert(rows, { onConflict: 'session_id,game_number,book_index,step', ignoreDuplicates: true });
    if (error) throw error;
  }
  await advanceIfComplete(session);
}
