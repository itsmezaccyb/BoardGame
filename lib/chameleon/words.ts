/**
 * Word list utilities for Chameleon
 */

export interface WordListInfo {
  id: string;
  name: string;
  filename: string;
  description?: string;
  is_default: boolean;
}

/**
 * Fetch all available Chameleon word lists
 */
export async function getWordLists(): Promise<WordListInfo[]> {
  try {
    console.log('📋 [Words API] Fetching word lists...');
    const response = await fetch('/api/chameleon/word-lists');
    const result = await response.json();

    console.log('📋 [Words API] Response:', { status: response.status, ok: response.ok, result });

    if (response.ok && result.lists) {
      console.log(`✅ [Words API] Loaded ${result.lists.length} word lists:`, result.lists);
      return result.lists;
    } else {
      console.error('❌ [Words API] Failed to fetch word lists:', result.error);
      return [];
    }
  } catch (error) {
    console.error('💥 [Words API] Error fetching word lists:', error);
    return [];
  }
}

/**
 * Load words from database for a specific variant
 */
export async function loadWordList(variant: string): Promise<string[]> {
  try {
    console.log(`📚 [Chameleon] Loading words for variant: ${variant}`);
    const response = await fetch(`/api/chameleon/words?variant=${encodeURIComponent(variant)}`);
    const result = await response.json();

    if (response.ok && result.words) {
      console.log(`✅ [Chameleon] Loaded ${result.words.length} words`);
      return result.words;
    } else {
      console.error('❌ [Chameleon] Failed to load words:', result.error);
      return [];
    }
  } catch (error) {
    console.error('💥 [Chameleon] Error loading words:', error);
    return [];
  }
}
