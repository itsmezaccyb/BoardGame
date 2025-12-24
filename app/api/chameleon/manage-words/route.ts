import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/chameleon/manage-words?listId=<uuid> - Fetch words for a specific list
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId');

    if (!listId) {
      return NextResponse.json({ error: 'listId parameter is required' }, { status: 400 });
    }

    console.log(`📖 [Manage Words API] Loading words for list: ${listId}`);

    const { data: words, error } = await supabase
      .from('chameleon_words')
      .select('id, word')
      .eq('word_list_id', listId)
      .order('word', { ascending: true });

    if (error) {
      console.error('❌ [Manage Words API] Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch words' }, { status: 500 });
    }

    console.log(`✅ [Manage Words API] Loaded ${words?.length || 0} words`);
    return NextResponse.json({ words });
  } catch (error) {
    console.error('💥 [Manage Words API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/chameleon/manage-words - Add word(s) to a list
export async function POST(request: NextRequest) {
  try {
    const { listId, word, words } = await request.json();

    if (!listId) {
      return NextResponse.json({ error: 'listId is required' }, { status: 400 });
    }

    if (!word && (!words || words.length === 0)) {
      return NextResponse.json({ error: 'word or words is required' }, { status: 400 });
    }

    const wordsToAdd = word ? [word] : words;

    console.log(`➕ [Manage Words API] Adding ${wordsToAdd.length} word(s) to list: ${listId}`);

    // Insert words (will ignore duplicates due to unique constraint)
    const { data: insertedWords, error } = await supabase
      .from('chameleon_words')
      .insert(
        wordsToAdd.map((w: string) => ({
          word_list_id: listId,
          word: w.trim(),
        }))
      )
      .select('id, word');

    if (error && error.code !== '23505') { // 23505 = unique constraint violation (duplicates)
      console.error('❌ [Manage Words API] Insert error:', error);
      return NextResponse.json({ error: 'Failed to add words' }, { status: 500 });
    }

    const addedWords = insertedWords || [];
    console.log(`✅ [Manage Words API] Added ${addedWords.length} word(s)`);

    // Return single word for single add, array for bulk
    if (word && addedWords.length > 0) {
      return NextResponse.json({ word: addedWords[0] });
    } else {
      return NextResponse.json({ words: addedWords });
    }
  } catch (error) {
    console.error('💥 [Manage Words API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/chameleon/manage-words?listId=<uuid>&wordId=<uuid> - Remove word from list
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId');
    const wordId = searchParams.get('wordId');

    if (!listId || !wordId) {
      console.error('❌ [Manage Words API] Missing parameters - listId:', listId, 'wordId:', wordId);
      return NextResponse.json({ error: 'listId and wordId parameters are required' }, { status: 400 });
    }

    console.log(`🗑️ [Manage Words API] Deleting word: ${wordId} from list: ${listId}`);

    // First verify the word exists
    const { data: existingWord, error: checkError } = await supabase
      .from('chameleon_words')
      .select('id, word')
      .eq('id', wordId)
      .eq('word_list_id', listId)
      .single();

    if (checkError || !existingWord) {
      console.error('❌ [Manage Words API] Word not found:', checkError);
      return NextResponse.json({ error: 'Word not found' }, { status: 404 });
    }

    console.log(`📋 [Manage Words API] Found word to delete:`, existingWord);

    const { error } = await supabase
      .from('chameleon_words')
      .delete()
      .eq('id', wordId)
      .eq('word_list_id', listId);

    if (error) {
      console.error('❌ [Manage Words API] Delete error:', error);
      return NextResponse.json({ error: 'Failed to remove word' }, { status: 500 });
    }

    console.log(`✅ [Manage Words API] Successfully deleted word: ${wordId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('💥 [Manage Words API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
