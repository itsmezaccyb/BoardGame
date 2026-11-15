import { NextRequest, NextResponse } from 'next/server';
import { ApiError, fillMissingAndAdvance, handle, loadPlayers, loadSession, requireLeader } from '@/lib/doodle/server';

export const dynamic = 'force-dynamic';

// POST /api/doodle-relay/skip  { code, token, round }
// Leader moves on without whoever hasn't submitted (they get a blank page).
export async function POST(request: NextRequest) {
  return handle(async () => {
    const { code, token, round } = await request.json();
    const session = await loadSession(code);
    requireLeader(await loadPlayers(session.id), token);
    if (session.status !== 'playing') throw new ApiError(400, 'No round is running');
    if (round === session.round) await fillMissingAndAdvance(session);
    return NextResponse.json({ success: true });
  });
}
