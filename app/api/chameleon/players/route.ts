import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// GET /api/chameleon/players?code=<session_code> - Get all players in session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Session code is required' }, { status: 400 });
    }

    console.log(`👥 [Players API] Getting players for session: ${code}`);

    // First get the session
    const { data: session, error: sessionError } = await supabase
      .from('chameleon_game_sessions')
      .select('id')
      .eq('session_code', code.toUpperCase())
      .single();

    if (sessionError) {
      console.log(`❌ [Players API] Session not found: ${code}`);
      return NextResponse.json({ error: 'Game session not found' }, { status: 404 });
    }

    // Get all players
    const { data: players, error: playersError } = await supabase
      .from('chameleon_players')
      .select('id, player_name, player_id, join_order, is_leader')
      .eq('session_id', session.id)
      .order('join_order', { ascending: true });

    if (playersError) {
      console.error('❌ [Players API] Error fetching players:', playersError);
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
    }

    console.log(`✅ [Players API] Found ${players?.length || 0} players`);
    return NextResponse.json({ players: players || [] });
  } catch (error) {
    console.error('💥 [Players API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/chameleon/players - Join game session
export async function POST(request: NextRequest) {
  try {
    const { sessionCode, playerName } = await request.json();

    if (!sessionCode || !playerName) {
      return NextResponse.json({ error: 'sessionCode and playerName are required' }, { status: 400 });
    }

    console.log(`👤 [Players API] Player joining: ${playerName} to session ${sessionCode}`);

    // Get the session
    const { data: session, error: sessionError } = await supabase
      .from('chameleon_game_sessions')
      .select('id')
      .eq('session_code', sessionCode.toUpperCase())
      .single();

    if (sessionError) {
      console.log(`❌ [Players API] Session not found: ${sessionCode}`);
      return NextResponse.json({ error: 'Game session not found' }, { status: 404 });
    }

    // Check player count
    const { count, error: countError } = await supabase
      .from('chameleon_players')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session.id);

    if (countError) {
      console.error('❌ [Players API] Error checking player count:', countError);
      return NextResponse.json({ error: 'Failed to check player count' }, { status: 500 });
    }

    if ((count || 0) >= 8) {
      console.log(`❌ [Players API] Game is full (8 players max)`);
      return NextResponse.json({ error: 'Game is full (8 players max)' }, { status: 400 });
    }

    // Calculate join order and leader status
    const joinOrder = (count || 0) + 1;
    const isLeader = joinOrder === 1;
    const playerId = randomUUID();

    console.log(`📋 [Players API] Join order: ${joinOrder}, is_leader: ${isLeader}`);

    // Create the player
    const { data: player, error: playerError } = await supabase
      .from('chameleon_players')
      .insert({
        session_id: session.id,
        player_name: playerName.trim(),
        player_id: playerId,
        join_order: joinOrder,
        is_leader: isLeader,
      })
      .select('id, player_name, player_id, join_order, is_leader')
      .single();

    if (playerError) {
      console.error('❌ [Players API] Failed to create player:', playerError);
      return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
    }

    console.log(`✅ [Players API] Player joined: ${playerName} (ID: ${playerId})`);
    return NextResponse.json({ player, isLeader });
  } catch (error) {
    console.error('💥 [Players API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/chameleon/players?playerId=<player_id> - Leave game
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json({ error: 'playerId parameter is required' }, { status: 400 });
    }

    console.log(`👋 [Players API] Player leaving: ${playerId}`);

    // First get the player and session
    const { data: player, error: playerError } = await supabase
      .from('chameleon_players')
      .select('id, session_id, is_leader')
      .eq('player_id', playerId)
      .single();

    if (playerError) {
      console.log(`❌ [Players API] Player not found: ${playerId}`);
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Delete the player
    const { error: deleteError } = await supabase
      .from('chameleon_players')
      .delete()
      .eq('player_id', playerId);

    if (deleteError) {
      console.error('❌ [Players API] Failed to delete player:', deleteError);
      return NextResponse.json({ error: 'Failed to leave game' }, { status: 500 });
    }

    // If the player was leader, transfer leadership to next player
    if (player.is_leader) {
      console.log(`🔄 [Players API] Leader left, transferring leadership...`);

      const { data: nextPlayer, error: nextError } = await supabase
        .from('chameleon_players')
        .select('id')
        .eq('session_id', player.session_id)
        .order('join_order', { ascending: true })
        .limit(1)
        .single();

      if (nextError && nextError.code !== 'PGRST116') {
        console.error('⚠️ [Players API] Error finding next leader:', nextError);
      } else if (nextPlayer) {
        const { error: updateError } = await supabase
          .from('chameleon_players')
          .update({ is_leader: true })
          .eq('id', nextPlayer.id);

        if (updateError) {
          console.error('⚠️ [Players API] Error transferring leadership:', updateError);
        } else {
          console.log(`✅ [Players API] Leadership transferred`);
        }
      }
    }

    console.log(`✅ [Players API] Player left: ${playerId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('💥 [Players API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
