/**
 * Game logic for Codenames
 * Handles key generation, game state, and synchronization
 */

export type CardType = 'red' | 'blue' | 'neutral' | 'assassin';
export type StartingTeam = 'red' | 'blue';

export interface Card {
  id: number;
  content: string; // word or image path
  type: CardType;
  revealed: boolean;
}

export interface GameState {
  code: string;
  mode: 'word' | 'image';
  variant: string; // word list filename or image folder name
  cards: Card[];
  startingTeam: StartingTeam;
}

/**
 * Generate a game code (6-character alphanumeric)
 */
export function generateGameCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Convert game code to numeric seed
 */
function codeToSeed(code: string): number {
  let seed = 0;
  for (let i = 0; i < code.length; i++) {
    seed = seed * 36 + parseInt(code[i], 36);
  }
  return seed;
}

/**
 * Seeded random number generator
 */
function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed + index) * 10000;
  return x - Math.floor(x);
}

/**
 * Generate key card layout (9 red, 8 blue, 7 neutral, 1 assassin)
 * @param seed - Seed for random generation
 * @returns Array of 25 card types
 */
export function generateKey(seed: number): CardType[] {
  const key: CardType[] = [];
  
  // Add 9 red cards
  for (let i = 0; i < 9; i++) {
    key.push('red');
  }
  
  // Add 8 blue cards
  for (let i = 0; i < 8; i++) {
    key.push('blue');
  }
  
  // Add 7 neutral cards
  for (let i = 0; i < 7; i++) {
    key.push('neutral');
  }
  
  // Add 1 assassin
  key.push('assassin');
  
  // Shuffle using seeded random
  for (let i = key.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed, i) * (i + 1));
    [key[i], key[j]] = [key[j], key[i]];
  }
  
  return key;
}

/**
 * Determine starting team (red or blue)
 * @param seed - Seed for random generation
 */
export function getStartingTeam(seed: number): StartingTeam {
  return seededRandom(seed, 999) < 0.5 ? 'red' : 'blue';
}

/**
 * Create game state from code and card contents
 * @param code - Game code
 * @param mode - 'word' or 'image'
 * @param variant - Word list filename or image folder name
 * @param contents - Array of 25 words or image paths
 */
export function createGameState(
  code: string,
  mode: 'word' | 'image',
  variant: string,
  contents: string[]
): GameState {
  if (contents.length !== 25) {
    throw new Error('Must provide exactly 25 cards');
  }
  
  const seed = codeToSeed(code);
  const key = generateKey(seed);
  const startingTeam = getStartingTeam(seed);
  
  const cards: Card[] = contents.map((content, index) => ({
    id: index,
    content,
    type: key[index],
    revealed: false,
  }));
  
  return {
    code,
    mode,
    variant,
    cards,
    startingTeam,
  };
}

/**
 * Reveal a card in the game state
 */
export function revealCard(gameState: GameState, cardId: number): GameState {
  return {
    ...gameState,
    cards: gameState.cards.map(card =>
      card.id === cardId ? { ...card, revealed: true } : card
    ),
  };
}

/**
 * Reset all revealed cards
 */
export function resetRevealed(gameState: GameState): GameState {
  return {
    ...gameState,
    cards: gameState.cards.map(card => ({ ...card, revealed: false })),
  };
}

/**
 * Load game state from localStorage
 */
export function loadGameStateFromStorage(code: string): GameState | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(`codenames-${code}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading game state from storage:', error);
  }
  
  return null;
}

/**
 * Save game state to localStorage
 */
export function saveGameStateToStorage(gameState: GameState): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(`codenames-${gameState.code}`, JSON.stringify(gameState));
  } catch (error) {
    console.error('Error saving game state to storage:', error);
  }
}

