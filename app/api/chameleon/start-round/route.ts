import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  selectGridItems,
  selectSecretWord,
  selectChameleon,
  createRoundState,
  type Player,
} from '@/lib/chameleon/game';

// POST /api/chameleon/start-round - Start new round
export async function POST(request: NextRequest) {
  try {
    const { sessionCode, playerId, roundNumber = 1 } = await request.json();

    if (!sessionCode || !playerId) {
      return NextResponse.json({ error: 'sessionCode and playerId are required' }, { status: 400 });
    }

    console.log(`🎮 [Start Round API] Starting round for session: ${sessionCode}`);

    // Get the session
    const { data: session, error: sessionError } = await supabase
      .from('chameleon_game_sessions')
      .select('*')
      .eq('session_code', sessionCode.toUpperCase())
      .single();

    if (sessionError) {
      console.log(`❌ [Start Round API] Session not found: ${sessionCode}`);
      return NextResponse.json({ error: 'Game session not found' }, { status: 404 });
    }

    // Verify player is leader
    const { data: player, error: playerError } = await supabase
      .from('chameleon_players')
      .select('is_leader, session_id')
      .eq('player_id', playerId)
      .single();

    if (playerError) {
      console.log(`❌ [Start Round API] Player not found: ${playerId}`);
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    if (!player.is_leader) {
      console.log(`❌ [Start Round API] Only leader can start rounds`);
      return NextResponse.json({ error: 'Only the game leader can start rounds' }, { status: 403 });
    }

    // Get all players in the session
    const { data: allPlayers, error: playersError } = await supabase
      .from('chameleon_players')
      .select('id, player_name, join_order, is_leader')
      .eq('session_id', session.id)
      .order('join_order', { ascending: true });

    if (playersError) {
      console.error('❌ [Start Round API] Error fetching players:', playersError);
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
    }

    if (!allPlayers || allPlayers.length < 3) {
      console.log(`❌ [Start Round API] Minimum 3 players required (have ${allPlayers?.length || 0})`);
      return NextResponse.json(
        { error: 'Minimum 3 players required to start game' },
        { status: 400 }
      );
    }

    console.log(`👥 [Start Round API] Found ${allPlayers.length} players`);

    // Fetch items (words or images) from database
    let allItems: string[] = [];

    if (session.mode === 'word') {
      const { data: wordListData, error: wordError } = await supabase
        .from('chameleon_word_lists')
        .select('id')
        .eq('filename', session.variant)
        .single();

      if (wordError) {
        console.error(`❌ [Start Round API] Word list not found: ${session.variant}`);
        return NextResponse.json({ error: 'Word list not found' }, { status: 404 });
      }

      const { data: words, error: wordsError } = await supabase
        .from('chameleon_words')
        .select('word')
        .eq('word_list_id', wordListData.id);

      if (wordsError) {
        console.error('❌ [Start Round API] Error fetching words:', wordsError);
        return NextResponse.json({ error: 'Failed to fetch words' }, { status: 500 });
      }

      allItems = (words || []).map(w => w.word);
    } else {
      const { data: imageListData, error: imageError } = await supabase
        .from('chameleon_image_lists')
        .select('id')
        .eq('folder', session.variant)
        .single();

      if (imageError) {
        console.error(`❌ [Start Round API] Image list not found: ${session.variant}`);
        return NextResponse.json({ error: 'Image list not found' }, { status: 404 });
      }

      const { data: images, error: imagesError } = await supabase
        .from('chameleon_images')
        .select('image_path')
        .eq('image_list_id', imageListData.id);

      if (imagesError) {
        console.error('❌ [Start Round API] Error fetching images:', imagesError);
        return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
      }

      allItems = (images || []).map(i => i.image_path);
    }

    if (allItems.length < 16) {
      console.error(`❌ [Start Round API] Not enough items (need 16, have ${allItems.length})`);
      return NextResponse.json(
        { error: `Not enough ${session.mode}s in this list (need at least 16)` },
        { status: 400 }
      );
    }

    console.log(`📦 [Start Round API] Fetched ${allItems.length} items for grid`);

    // Create round state using seeded randomness
    const gameState = createRoundState(
      session.session_code,
      session.mode,
      session.variant,
      roundNumber,
      allItems,
      allPlayers as Player[],
      playerId
    );

    // Update session with new game state
    const { error: updateError } = await supabase
      .from('chameleon_game_sessions')
      .update({
        game_state: gameState,
        status: 'active',
      })
      .eq('id', session.id);

    if (updateError) {
      console.error('❌ [Start Round API] Failed to update session:', updateError);
      return NextResponse.json({ error: 'Failed to start round' }, { status: 500 });
    }

    console.log(`✅ [Start Round API] Round started successfully`);
    console.log(`🎭 [Start Round API] Chameleon: ${gameState.chameleon_player_id}`);
    console.log(`🔐 [Start Round API] Secret word: ${gameState.secret_word}`);

    return NextResponse.json({ success: true, round: gameState });
  } catch (error) {
    console.error('💥 [Start Round API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
