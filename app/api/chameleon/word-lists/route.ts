import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/chameleon/word-lists - Get all Chameleon word lists
export async function GET(request: NextRequest) {
  try {
    console.log('📋 [Word Lists API] Fetching word lists');

    const { data: lists, error } = await supabase
      .from('chameleon_word_lists')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ [Word Lists API] Database error:', error);
      console.error('  Error code:', error.code);
      console.error('  Error message:', error.message);
      console.error('  Error details:', error.details);
      return NextResponse.json({
        error: 'Failed to fetch word lists',
        details: error.message
      }, { status: 500 });
    }

    console.log(`✅ [Word Lists API] Fetched ${lists?.length || 0} word lists`);
    if (lists && lists.length > 0) {
      console.log('📋 [Word Lists API] Lists:', JSON.stringify(lists, null, 2));
    } else {
      console.log('⚠️ [Word Lists API] No lists found in database');
    }
    return NextResponse.json({ lists });
  } catch (error) {
    console.error('💥 [Word Lists API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
