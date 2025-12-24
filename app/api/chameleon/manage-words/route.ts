import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/chameleon/manage-words?listId=<filename> - Fetch words for a specific list
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId');

    if (!listId) {
      return NextResponse.json({ error: 'listId parameter is required' }, { status: 400 });
    }

    console.log(`📖 [Manage Words API] Loading words for list: ${listId}`);

    // First get the word list by filename to get its ID
    const { data: wordList, error: listError } = await supabase
      .from('chameleon_word_lists')
      .select('id')
      .eq('filename', listId)
      .single();

    if (listError) {
      console.error('❌ [Manage Words API] Word list not found:', listError);
      return NextResponse.json({ error: 'Word list not found' }, { status: 404 });
    }

    const { data: words, error } = await supabase
      .from('chameleon_words')
      .select('id, word, created_at')
      .eq('word_list_id', wordList.id)
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

    if (!word && (!words || !Array.isArray(words))) {
      return NextResponse.json({ error: 'Either word or words array is required' }, { status: 400 });
    }

    console.log(`➕ [Manage Words API] Adding to list: ${listId}`);

    // Get the word list by filename
    const { data: wordList, error: listError } = await supabase
      .from('chameleon_word_lists')
      .select('id')
      .eq('filename', listId)
      .single();

    if (listError) {
      console.error('❌ [Manage Words API] Word list not found:', listError);
      return NextResponse.json({ error: 'Word list not found' }, { status: 404 });
    }

    // Handle single word addition
    if (word) {
      const trimmedWord = word.trim().toLowerCase();

      if (!trimmedWord) {
        return NextResponse.json({ error: 'Word cannot be empty' }, { status: 400 });
      }

      console.log(`➕ [Manage Words API] Adding single word "${trimmedWord}"`);

      // Check if word already exists in this list
      const { data: existingWord, error: checkError } = await supabase
        .from('chameleon_words')
        .select('id')
        .eq('word_list_id', wordList.id)
        .eq('word', trimmedWord)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ [Manage Words API] Check error:', checkError);
        return NextResponse.json({ error: 'Failed to check for duplicate word' }, { status: 500 });
      }

      if (existingWord) {
        return NextResponse.json({ error: 'Word already exists in this list' }, { status: 409 });
      }

      // Add the word
      const { data: newWord, error: insertError } = await supabase
        .from('chameleon_words')
        .insert({
          word_list_id: wordList.id,
          word: trimmedWord
        })
        .select('id, word, created_at')
        .single();

      if (insertError) {
        console.error('❌ [Manage Words API] Insert error:', insertError);
        return NextResponse.json({ error: 'Failed to add word' }, { status: 500 });
      }

      console.log(`✅ [Manage Words API] Added word: ${trimmedWord}`);
      return NextResponse.json({ word: newWord });
    }

    // Handle bulk word addition
    if (words && Array.isArray(words)) {
      console.log(`📦 [Manage Words API] Adding ${words.length} words`);

      // Validate and deduplicate words
      const uniqueWords = Array.from(new Set(words.map(w => w.toLowerCase().trim())))
        .filter(word => word.length > 0);

      if (uniqueWords.length === 0) {
        return NextResponse.json({ error: 'No valid words provided' }, { status: 400 });
      }

      // Check for existing words to avoid duplicates
      const { data: existingWords, error: checkError } = await supabase
        .from('chameleon_words')
        .select('word')
        .eq('word_list_id', wordList.id);

      if (checkError) {
        console.error('❌ [Manage Words API] Check existing words error:', checkError);
        return NextResponse.json({ error: 'Failed to check existing words' }, { status: 500 });
      }

      const existingWordSet = new Set((existingWords || []).map(w => w.word.toLowerCase()));

      // Filter out words that already exist
      const wordsToAdd = uniqueWords.filter(word => !existingWordSet.has(word));

      if (wordsToAdd.length === 0) {
        return NextResponse.json({ error: 'All words already exist in this list' }, { status: 409 });
      }

      const wordInserts = wordsToAdd.map(word => ({
        word_list_id: wordList.id,
        word: word
      }));

      const { data: newWords, error: wordsError } = await supabase
        .from('chameleon_words')
        .insert(wordInserts)
        .select('id, word, created_at');

      if (wordsError) {
        console.error('❌ [Manage Words API] Words insert error:', wordsError);
        return NextResponse.json({ error: 'Failed to add words' }, { status: 500 });
      }

      console.log(`✅ [Manage Words API] Added ${newWords?.length || 0} words`);
      return NextResponse.json({ words: newWords });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('💥 [Manage Words API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/chameleon/manage-words?listId=<filename>&wordId=<uuid> - Remove word from list
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId');
    const wordId = searchParams.get('wordId');

    if (!listId || !wordId) {
      return NextResponse.json({ error: 'listId and wordId parameters are required' }, { status: 400 });
    }

    console.log(`🗑️ [Manage Words API] Removing word ${wordId} from list: ${listId}`);

    // Get the word list by filename to verify it exists
    const { data: wordList, error: listError } = await supabase
      .from('chameleon_word_lists')
      .select('id')
      .eq('filename', listId)
      .single();

    if (listError) {
      console.error('❌ [Manage Words API] Word list not found:', listError);
      return NextResponse.json({ error: 'Word list not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('chameleon_words')
      .delete()
      .eq('id', wordId)
      .eq('word_list_id', wordList.id); // Extra safety check

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
