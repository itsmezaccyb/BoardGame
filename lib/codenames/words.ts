/**
 * Word list management for Codenames
 * Uses Supabase database instead of static files
 */

import { supabase, type WordList, type Word } from '../supabase';

export interface WordListInfo {
  name: string;
  filename: string;
  description?: string;
  is_default?: boolean;
}

/**
 * Get list of available word lists from Supabase
 */
export async function getWordLists(): Promise<WordListInfo[]> {
  try {
    const { data, error } = await supabase
      .from('word_lists')
      .select('name, filename, description, is_default')
      .order('name');

    if (error) {
      console.error('Error fetching word lists:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching word lists:', error);
    return [];
  }
}

/**
 * Load words from a word list in Supabase
 * @param filename - Name of the word list file
 */
export async function loadWordList(filename: string): Promise<string[]> {
  try {
    // First get the word list ID
    const { data: wordList, error: listError } = await supabase
      .from('word_lists')
      .select('id')
      .eq('filename', filename)
      .single();

    if (listError || !wordList) {
      console.error('Word list not found:', filename);
      return [];
    }

    // Then get all words for this list
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('word')
      .eq('word_list_id', wordList.id)
      .order('word');

    if (wordsError) {
      console.error('Error fetching words:', wordsError);
      return [];
    }

    return (words || []).map(w => w.word.toLowerCase());
  } catch (error) {
    console.error('Error loading word list:', error);
    return [];
  }
}

/**
 * Select 25 random words from a word list using seeded random
 * @param words - Array of available words
 * @param seed - Seed for random number generation
 */
export function selectWords(words: string[], seed: number): string[] {
  if (words.length < 25) {
    throw new Error('Word list must contain at least 25 words');
  }

  // Seeded random function (same as Catan)
  const seededRandom = (index: number) => {
    const x = Math.sin(seed + index) * 10000;
    return x - Math.floor(x);
  };

  // Shuffle array using seeded random
  const shuffled = [...words];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(i) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Return first 25 words
  return shuffled.slice(0, 25);
}

