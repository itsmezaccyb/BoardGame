import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const { type, name, words } = await request.json();

        if (!type || !name) {
            return NextResponse.json({ error: 'type and name are required' }, { status: 400 });
        }

        if (!['word', 'image'].includes(type)) {
            return NextResponse.json({ error: 'type must be either "word" or "image"' }, { status: 400 });
        }

        const trimmedName = name.trim();

        if (!trimmedName) {
            return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
        }

        console.log(`🆕 [Create List API] Creating new ${type} list: ${trimmedName}`);

        if (type === 'word') {
            // Create word list
            // Generate a filename from the name (lowercase, replace spaces with hyphens, add .md)
            const filename = `${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;

            // Check if name or filename already exists
            const { data: existingList, error: checkError } = await supabase
                .from('word_lists')
                .select('id')
                .or(`name.eq.${trimmedName},filename.eq.${filename}`)
                .single();

            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('❌ [Create List API] Check error:', checkError);
                return NextResponse.json({ error: 'Failed to check for duplicate list' }, { status: 500 });
            }

            if (existingList) {
                return NextResponse.json({ error: 'A list with this name already exists' }, { status: 409 });
            }

            // Create the word list
            const { data: newList, error: insertError } = await supabase
                .from('word_lists')
                .insert({
                    name: trimmedName,
                    filename: filename,
                    is_default: false
                })
                .select()
                .single();

            if (insertError) {
                console.error('❌ [Create List API] Insert error:', insertError);
                return NextResponse.json({ error: 'Failed to create word list' }, { status: 500 });
            }

            console.log(`✅ [Create List API] Created word list: ${trimmedName}`);

            // Add words if provided
            let wordsAdded = 0;
            if (words && Array.isArray(words) && words.length > 0) {
                console.log(`📝 [Create List API] Adding ${words.length} words to list`);

                // Validate and deduplicate words
                const uniqueWords = Array.from(new Set(words.map(w => w.toLowerCase().trim())))
                    .filter(word => word.length > 0);

                if (uniqueWords.length > 0) {
                    // Check for existing words to avoid duplicates
                    const { data: existingWords, error: checkError } = await supabase
                        .from('words')
                        .select('word')
                        .eq('word_list_id', newList.id);

                    if (checkError) {
                        console.error('❌ [Create List API] Check existing words error:', checkError);
                        // Continue anyway, we'll handle duplicates in the insert
                    }

                    const existingWordSet = new Set((existingWords || []).map(w => w.word.toLowerCase()));

                    // Filter out words that already exist
                    const wordsToAdd = uniqueWords.filter(word => !existingWordSet.has(word));

                    if (wordsToAdd.length > 0) {
                        const wordInserts = wordsToAdd.map(word => ({
                            word_list_id: newList.id,
                            word: word
                        }));

                        const { error: wordsError } = await supabase
                            .from('words')
                            .insert(wordInserts);

                        if (wordsError) {
                            console.error('❌ [Create List API] Words insert error:', wordsError);
                            // Don't fail the whole operation, just log the error
                        } else {
                            wordsAdded = wordsToAdd.length;
                            console.log(`✅ [Create List API] Added ${wordsAdded} words to list`);
                        }
                    } else {
                        console.log(`ℹ️ [Create List API] All words already exist in the list`);
                    }
                }
            }

            return NextResponse.json({ list: newList, wordsAdded });

        } else {
            // Create image list
            // Generate a folder name from the name (lowercase, replace spaces with hyphens)
            const folder = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

            // Check if name or folder already exists
            const { data: existingList, error: checkError } = await supabase
                .from('image_lists')
                .select('id')
                .or(`name.eq.${trimmedName},folder.eq.${folder}`)
                .single();

            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('❌ [Create List API] Check error:', checkError);
                return NextResponse.json({ error: 'Failed to check for duplicate list' }, { status: 500 });
            }

            if (existingList) {
                return NextResponse.json({ error: 'A list with this name already exists' }, { status: 409 });
            }

            // Create the image list
            const { data: newList, error: insertError } = await supabase
                .from('image_lists')
                .insert({
                    name: trimmedName,
                    folder: folder,
                    is_default: false,
                    is_user_created: true
                })
                .select()
                .single();

            if (insertError) {
                console.error('❌ [Create List API] Insert error:', insertError);
                return NextResponse.json({ error: 'Failed to create image list' }, { status: 500 });
            }

            console.log(`✅ [Create List API] Created image list: ${trimmedName}`);
            return NextResponse.json({ list: newList });
        }

    } catch (error) {
        console.error('💥 [Create List API] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
