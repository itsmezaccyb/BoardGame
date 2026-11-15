import { NextRequest, NextResponse } from 'next/server';
import { db as supabase } from '@/lib/doodle/db';
import { ApiError, handle, loadSession } from '@/lib/doodle/server';

export const dynamic = 'force-dynamic';

// GET /api/doodle-relay/entry?code=&id=  → { content }
// Serves drawings separately from /state so the 1s poll stays small.
// Drawings never change once saved, so clients cache them by id.
export async function GET(request: NextRequest) {
  return handle(async () => {
    const { searchParams } = new URL(request.url);
    const session = await loadSession(searchParams.get('code'));
    const id = searchParams.get('id');
    if (!id) throw new ApiError(400, 'id is required');

    const { data, error } = await supabase
      .from('doodle_entries')
      .select('content')
      .eq('id', id)
      .eq('session_id', session.id)
      .eq('kind', 'drawing')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError(404, 'Drawing not found');

    return NextResponse.json(
      { content: data.content },
      { headers: { 'Cache-Control': 'private, max-age=86400, immutable' } },
    );
  });
}
