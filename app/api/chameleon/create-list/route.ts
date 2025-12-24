import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST /api/chameleon/create-list - Create new word or image list
export async function POST(request: NextRequest) {
  try {
    const { type, name, words } = await request.json();

    if (!type || !['word', 'image'].includes(type)) {
      return NextResponse.json({ error: 'type must be "word" or "image"' }, { status: 400 });
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();
    console.log(`🆕 [Create List API] Creating ${type} list: ${trimmedName}`);

    if (type === 'word') {
      // Create word list
      const filename = trimmedName.toLowerCase().replace(/\s+/g, '_');

      const { data: list, error: listError } = await supabase
        .from('chameleon_word_lists')
        .insert({
          name: trimmedName,
          filename: filename,
        })
        .select()
        .single();

      if (listError) {
        console.error('❌ [Create List API] Failed to create word list:', listError);
        console.error('Error details:', { code: listError.code, message: listError.message });
        if (listError.code === '23505') { // Unique constraint violation
          return NextResponse.json({ error: 'A list with this name already exists' }, { status: 400 });
        }
        if (listError.code === 'PGRST116') {
          return NextResponse.json({ error: 'Table does not exist - please run the migration first' }, { status: 500 });
        }
        return NextResponse.json({ error: `Failed to create word list: ${listError.message}` }, { status: 500 });
      }

      let wordsAdded = 0;

      // Add words if provided
      if (words && Array.isArray(words) && words.length > 0) {
        const { data: insertedWords, error: wordsError } = await supabase
          .from('chameleon_words')
          .insert(
            words.map(w => ({
              word_list_id: list.id,
              word: w.trim(),
            }))
          )
          .select();

        if (wordsError && wordsError.code !== '23505') {
          console.error('❌ [Create List API] Failed to add words:', wordsError);
          // List was created, but words failed - still return success
        } else {
          wordsAdded = insertedWords?.length || 0;
        }
      }

      console.log(`✅ [Create List API] Created word list: ${trimmedName} with ${wordsAdded} words`);
      return NextResponse.json({ list, wordsAdded });
    } else {
      // Create image list
      const folder = trimmedName.toLowerCase().replace(/\s+/g, '_');

      const { data: list, error: listError } = await supabase
        .from('chameleon_image_lists')
        .insert({
          name: trimmedName,
          folder: folder,
          is_user_created: true,
        })
        .select()
        .single();

      if (listError) {
        console.error('❌ [Create List API] Failed to create image list:', listError);
        console.error('Error details:', { code: listError.code, message: listError.message });
        if (listError.code === '23505') { // Unique constraint violation
          return NextResponse.json({ error: 'A list with this name already exists' }, { status: 400 });
        }
        if (listError.code === 'PGRST116') {
          return NextResponse.json({ error: 'Table does not exist - please run the migration first' }, { status: 500 });
        }
        return NextResponse.json({ error: `Failed to create image list: ${listError.message}` }, { status: 500 });
      }

      console.log(`✅ [Create List API] Created image list: ${trimmedName}`);
      return NextResponse.json({ list, wordsAdded: 0 });
    }
  } catch (error) {
    console.error('💥 [Create List API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
