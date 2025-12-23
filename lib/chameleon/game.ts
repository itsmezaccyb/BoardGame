/**
 * Game logic for Chameleon
 * Handles game state, seeded randomness, and player roles
 */

export interface GridItem {
  id: number;
  content: string;
}

export interface GameState {
  code: string;
  mode: 'word' | 'image';
  variant: string;
  round_number: number;
  grid_items: string[];
  secret_word: string;
  chameleon_player_id: string;
  leader_player_id: string;
  seed: number;
}

export interface Player {
  id: string;
  player_name: string;
  join_order: number;
  is_leader: boolean;
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
 * Select 16 grid items from a larger list using seeded randomness
 * @param items - All available items
 * @param seed - Seed for randomness
 * @param roundNumber - Current round (for variety across rounds)
 */
export function selectGridItems(
  items: string[],
  seed: number,
  roundNumber: number
): string[] {
  if (items.length < 16) {
    throw new Error('Must have at least 16 items to select from');
  }

  // Combine seed with round for variety across rounds
  const roundSeed = seed + roundNumber * 1000;

  // Create shuffled copy
  const shuffled = [...items];

  // Fisher-Yates shuffle using seeded random
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(roundSeed, i) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Take first 16
  return shuffled.slice(0, 16);
}

/**
 * Select the secret word (must be one of the 16 grid items)
 * @param gridItems - The 16 items in the grid
 * @param seed - Seed for randomness
 * @param roundNumber - Current round
 */
export function selectSecretWord(
  gridItems: string[],
  seed: number,
  roundNumber: number
): string {
  if (gridItems.length !== 16) {
    throw new Error('Grid must have exactly 16 items');
  }

  const secretIndex = Math.floor(
    seededRandom(seed, roundNumber + 500) * gridItems.length
  );
  return gridItems[secretIndex];
}

/**
 * Select the Chameleon player
 * @param players - Array of players in the game
 * @param seed - Seed for randomness
 * @param roundNumber - Current round
 */
export function selectChameleon(
  players: Player[],
  seed: number,
  roundNumber: number
): string {
  if (players.length === 0) {
    throw new Error('No players available for chameleon selection');
  }

  const chameleonIndex = Math.floor(
    seededRandom(seed, roundNumber + 999) * players.length
  );
  return players[chameleonIndex].id;
}

/**
 * Create game state for a new round
 */
export function createRoundState(
  code: string,
  mode: 'word' | 'image',
  variant: string,
  roundNumber: number,
  allItems: string[],
  players: Player[],
  leaderId: string
): GameState {
  const seed = codeToSeed(code);
  const gridItems = selectGridItems(allItems, seed, roundNumber);
  const secretWord = selectSecretWord(gridItems, seed, roundNumber);
  const chameleonPlayerId = selectChameleon(players, seed, roundNumber);

  return {
    code,
    mode,
    variant,
    round_number: roundNumber,
    grid_items: gridItems,
    secret_word: secretWord,
    chameleon_player_id: chameleonPlayerId,
    leader_player_id: leaderId,
    seed,
  };
}

/**
 * Load game state from server
 */
export async function loadGameStateFromServer(code: string): Promise<GameState | null> {
  try {
    console.log(`🎮 [Chameleon] Loading state from server: ${code}`);
    const response = await fetch(`/api/chameleon/game-sessions?code=${code}`);
    const result = await response.json();

    if (response.ok && result.session?.game_state) {
      console.log(`✅ [Chameleon] Loaded state from server: ${code}`);
      return result.session.game_state as GameState;
    }
  } catch (error) {
    console.error('Error loading game state from server:', error);
  }

  return null;
}

/**
 * Save game state to server
 */
export async function saveGameStateToServer(gameState: GameState): Promise<void> {
  try {
    console.log(`💾 [Chameleon] Saving state to server: ${gameState.code}`);
    const response = await fetch(`/api/chameleon/game-sessions?code=${gameState.code}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameState: gameState,
        status: 'active',
      }),
    });

    if (response.ok) {
      console.log(`✅ [Chameleon] Saved state to server: ${gameState.code}`);
    } else {
      console.error('❌ [Chameleon] Failed to save state to server');
    }
  } catch (error) {
    console.error('Error saving game state to server:', error);
  }
}
