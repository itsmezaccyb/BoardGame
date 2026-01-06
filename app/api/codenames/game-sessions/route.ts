import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/codenames/game-sessions?code=<session_code> - Get game session
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');

        if (!code) {
            return NextResponse.json({ error: 'Session code is required' }, { status: 400 });
        }

        console.log(`🎮 [Game Sessions API] Getting session: ${code}`);

        const { data: session, error } = await supabase
            .from('game_sessions')
            .select('*')
            .eq('session_code', code.toUpperCase())
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // No rows returned
                console.log(`❌ [Game Sessions API] Session not found: ${code}`);
                return NextResponse.json({ error: 'Game session not found' }, { status: 404 });
            }
            console.error('❌ [Game Sessions API] Database error:', error);
            return NextResponse.json({ error: 'Failed to fetch game session' }, { status: 500 });
        }

        console.log(`✅ [Game Sessions API] Found session: ${code}`);
        return NextResponse.json({ session });
    } catch (error) {
        console.error('💥 [Game Sessions API] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/codenames/game-sessions - Create new game session
export async function POST(request: NextRequest) {
    try {
        const { mode, variant } = await request.json();

        if (!mode || !variant) {
            return NextResponse.json({ error: 'mode and variant are required' }, { status: 400 });
        }

        if (!['word', 'image'].includes(mode)) {
            return NextResponse.json({ error: 'mode must be "word" or "image"' }, { status: 400 });
        }

        // Generate unique session code (6 characters, alphanumeric)
        let sessionCode;
        let attempts = 0;
        const maxAttempts = 10;

        do {
            sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            attempts++;

            const { data: existing } = await supabase
                .from('game_sessions')
                .select('id')
                .eq('session_code', sessionCode)
                .single();

            if (!existing) break;
        } while (attempts < maxAttempts);

        if (attempts >= maxAttempts) {
            return NextResponse.json({ error: 'Failed to generate unique session code' }, { status: 500 });
        }

        console.log(`🎮 [Game Sessions API] Creating session: ${sessionCode} (${mode}/${variant})`);

        const { data: session, error } = await supabase
            .from('game_sessions')
            .insert({
                session_code: sessionCode,
                mode,
                variant,
                game_state: {},
                status: 'waiting'
            })
            .select()
            .single();

        if (error) {
            console.error('❌ [Game Sessions API] Insert error:', error);
            return NextResponse.json({ error: 'Failed to create game session' }, { status: 500 });
        }

        console.log(`✅ [Game Sessions API] Created session: ${sessionCode}`);
        return NextResponse.json({ session });
    } catch (error) {
        console.error('💥 [Game Sessions API] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT /api/codenames/game-sessions?code=<session_code> - Update game session
export async function PUT(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');

        if (!code) {
            return NextResponse.json({ error: 'Session code is required' }, { status: 400 });
        }

        const { gameState, status } = await request.json();

        console.log(`🔄 [Game Sessions API] Updating session: ${code}`);

        const updateData: any = {};
        if (gameState !== undefined) updateData.game_state = gameState;
        if (status !== undefined) updateData.status = status;

        const { data: session, error } = await supabase
            .from('game_sessions')
            .update(updateData)
            .eq('session_code', code.toUpperCase())
            .select()
            .single();

        if (error) {
            console.error('❌ [Game Sessions API] Update error:', error);
            return NextResponse.json({ error: 'Failed to update game session' }, { status: 500 });
        }

        console.log(`✅ [Game Sessions API] Updated session: ${code}`);
        return NextResponse.json({ session });
    } catch (error) {
        console.error('💥 [Game Sessions API] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

