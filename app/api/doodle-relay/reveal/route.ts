import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ApiError, handle, loadPlayers, loadSession, requireLeader } from '@/lib/doodle/server';

export const dynamic = 'force-dynamic';

// POST /api/doodle-relay/reveal  { code, token, book, step }
// Leader moves everyone's screen to a page of a sketchbook.
export async function POST(request: NextRequest) {
  return handle(async () => {
    const { code, token, book, step } = await request.json();
    const session = await loadSession(code);
    requireLeader(await loadPlayers(session.id), token);
    if (session.status !== 'reveal') throw new ApiError(400, 'Nothing to reveal yet');

    const books = session.seat_order.length;
    const lastStep = session.total_rounds;
    const b = Math.min(Math.max(Number(book) || 0, 0), books - 1);
    const s = Math.min(Math.max(Number(step) || 0, 0), lastStep);

    const { error } = await supabase
      .from('doodle_sessions')
      .update({ reveal_book: b, reveal_step: s, updated_at: new Date().toISOString() })
      .eq('id', session.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  });
}
