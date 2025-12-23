import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/chameleon/seed-lists - Seed default lists (admin only)
export async function POST(request: NextRequest) {
  try {
    console.log('🌱 [Seed Lists API] Starting seeding process...');

    // List of default word lists to create
    const wordLists = [
      { name: 'Animals', filename: 'animals', description: 'Common animal names for Chameleon' },
      { name: 'Food', filename: 'food', description: 'Common food and drink items for Chameleon' },
      { name: 'Sports', filename: 'sports', description: 'Sports and athletic activities for Chameleon' },
      { name: 'Vehicles', filename: 'vehicles', description: 'Transportation and vehicles for Chameleon' },
      { name: 'Countries', filename: 'countries', description: 'Country names for Chameleon' },
    ];

    const wordsByList = {
      animals: ['Lion', 'Tiger', 'Elephant', 'Giraffe', 'Zebra', 'Monkey', 'Bear', 'Penguin', 'Eagle', 'Shark', 'Dolphin', 'Whale', 'Kangaroo', 'Panda', 'Owl', 'Snake', 'Cheetah', 'Rhino', 'Hippopotamus', 'Crocodile'],
      food: ['Apple', 'Banana', 'Pizza', 'Burger', 'Spaghetti', 'Sushi', 'Chocolate', 'Ice Cream', 'Coffee', 'Sandwich', 'Tacos', 'Donut', 'Broccoli', 'Carrot', 'Cheese', 'Salmon', 'Rice', 'Pasta', 'Cake', 'Cookies'],
      sports: ['Soccer', 'Basketball', 'Tennis', 'Swimming', 'Running', 'Cycling', 'Skiing', 'Surfing', 'Boxing', 'Golf', 'Cricket', 'Baseball', 'Volleyball', 'Bowling', 'Hockey', 'Rugby', 'Wrestling', 'Gymnastics', 'Skateboarding', 'Climbing'],
      vehicles: ['Car', 'Bicycle', 'Train', 'Airplane', 'Boat', 'Helicopter', 'Motorcycle', 'Bus', 'Truck', 'Submarine', 'Rocket', 'Skateboard', 'Scooter', 'Wagon', 'Canoe', 'Ambulance', 'Police Car', 'Fire Truck', 'Hot Air Balloon', 'Jet'],
      countries: ['Japan', 'Brazil', 'France', 'Australia', 'Canada', 'India', 'Mexico', 'Egypt', 'Greece', 'Italy', 'Spain', 'Germany', 'Russia', 'China', 'United States', 'Thailand', 'Norway', 'New Zealand', 'South Korea', 'Ireland'],
    };

    let createdListsCount = 0;
    let addedWordsCount = 0;

    // Create each word list
    for (const list of wordLists) {
      console.log(`📝 [Seed Lists API] Creating list: ${list.name}`);

      // Insert the list
      const { data: createdList, error: listError } = await supabase
        .from('chameleon_word_lists')
        .insert({
          name: list.name,
          filename: list.filename,
          description: list.description,
          is_default: true,
        })
        .select('id')
        .single();

      if (listError) {
        if (listError.code === '23505') {
          // Unique constraint violation - list already exists
          console.log(`⚠️ [Seed Lists API] List already exists: ${list.name}`);
          // Get the existing list's ID
          const { data: existingList, error: getError } = await supabase
            .from('chameleon_word_lists')
            .select('id')
            .eq('filename', list.filename)
            .single();

          if (getError) {
            console.error(`❌ [Seed Lists API] Error getting existing list: ${list.name}`, getError);
            continue;
          }

          // Add words to existing list
          const words = (wordsByList as Record<string, string[]>)[list.filename];
          if (existingList && words) {
            console.log(`➕ [Seed Lists API] Adding ${words.length} words to existing list: ${list.name}`);
            const { data: insertedWords, error: wordsError } = await supabase
              .from('chameleon_words')
              .insert(
                words.map(word => ({
                  word_list_id: existingList.id,
                  word: word,
                }))
              );

            if (wordsError && wordsError.code !== '23505') {
              console.error(`❌ [Seed Lists API] Error adding words to ${list.name}:`, wordsError);
            } else {
              addedWordsCount += words.length;
              console.log(`✅ [Seed Lists API] Added words to ${list.name}`);
            }
          }
        } else {
          console.error(`❌ [Seed Lists API] Error creating list: ${list.name}`, listError);
        }
      } else {
        // Successfully created new list
        console.log(`✅ [Seed Lists API] Created list: ${list.name}`);
        createdListsCount++;

        // Add words to the newly created list
        const words = (wordsByList as Record<string, string[]>)[list.filename];
        if (createdList && words) {
          console.log(`➕ [Seed Lists API] Adding ${words.length} words to ${list.name}`);
          const { data: insertedWords, error: wordsError } = await supabase
            .from('chameleon_words')
            .insert(
              words.map(word => ({
                word_list_id: createdList.id,
                word: word,
              }))
            );

          if (wordsError) {
            console.error(`❌ [Seed Lists API] Error adding words to ${list.name}:`, wordsError);
          } else {
            addedWordsCount += words.length;
            console.log(`✅ [Seed Lists API] Added ${words.length} words to ${list.name}`);
          }
        }
      }
    }

    console.log(`🌱 [Seed Lists API] Seeding complete! Created ${createdListsCount} lists, added ${addedWordsCount} words`);
    return NextResponse.json({
      success: true,
      message: `Seeding complete! Created ${createdListsCount} lists and added ${addedWordsCount} words.`,
      createdLists: createdListsCount,
      addedWords: addedWordsCount,
    });
  } catch (error) {
    console.error('💥 [Seed Lists API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
