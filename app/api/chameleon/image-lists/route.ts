import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/chameleon/image-lists - Get all Chameleon image lists
export async function GET(request: NextRequest) {
  try {
    console.log('🖼️ [Image Lists API] Fetching image lists');

    const { data: lists, error } = await supabase
      .from('chameleon_image_lists')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ [Image Lists API] Database error:', error);
      console.error('  Error code:', error.code);
      console.error('  Error message:', error.message);
      console.error('  Error details:', error.details);
      return NextResponse.json({
        error: 'Failed to fetch image lists',
        details: error.message
      }, { status: 500 });
    }

    console.log(`✅ [Image Lists API] Fetched ${lists?.length || 0} image lists`);
    if (lists && lists.length > 0) {
      console.log('🖼️ [Image Lists API] Lists:', JSON.stringify(lists, null, 2));
    } else {
      console.log('⚠️ [Image Lists API] No lists found in database');
    }
    return NextResponse.json({ lists });
  } catch (error) {
    console.error('💥 [Image Lists API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
