import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/chameleon/words?variant=<filename> - Get words from database for a variant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const variant = searchParams.get('variant');

    if (!variant) {
      return NextResponse.json({ error: 'Variant parameter is required' }, { status: 400 });
    }

    console.log(`📚 [Words API] Fetching words for variant: ${variant}`);

    // First, find the word list by filename
    const { data: wordList, error: listError } = await supabase
      .from('chameleon_word_lists')
      .select('id')
      .eq('filename', variant)
      .single();

    if (listError) {
      console.error(`❌ [Words API] Word list not found: ${variant}`, listError);
      return NextResponse.json({ error: 'Word list not found' }, { status: 404 });
    }

    // Then fetch all words for this list
    const { data: words, error: wordsError } = await supabase
      .from('chameleon_words')
      .select('word')
      .eq('word_list_id', wordList.id)
      .order('word', { ascending: true });

    if (wordsError) {
      console.error('❌ [Words API] Database error:', wordsError);
      return NextResponse.json({ error: 'Failed to fetch words' }, { status: 500 });
    }

    const wordList_items = (words || []).map(w => w.word);
    console.log(`✅ [Words API] Fetched ${wordList_items.length} words for variant: ${variant}`);
    return NextResponse.json({ words: wordList_items });
  } catch (error) {
    console.error('💥 [Words API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
