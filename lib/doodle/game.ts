/**
 * Doodle Relay — pure game logic shared by the API routes and the UI.
 *
 * Every player owns one sketchbook, which starts with a secret prompt (step 0).
 * In round r (1-based) the book owned by seat b is held by seat (b + r) % N.
 * Odd rounds are drawings, even rounds are guesses. With an even number of
 * players the book makes one extra hop so it lands back with its owner for
 * the final guess; with an odd number it already ends on a guess.
 */

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;
export const CANVAS_SIZE = 640;
export const TIMER_OPTIONS = [0, 60, 90, 120] as const;

export type EntryKind = 'prompt' | 'drawing' | 'guess';

export function totalRounds(playerCount: number): number {
  return playerCount % 2 === 0 ? playerCount : playerCount - 1;
}

export function kindForStep(step: number): EntryKind {
  if (step === 0) return 'prompt';
  return step % 2 === 1 ? 'drawing' : 'guess';
}

/** Which book (by owner seat) the player at `seat` holds in `round`. */
export function bookForSeat(seat: number, round: number, playerCount: number): number {
  return (((seat - round) % playerCount) + playerCount) % playerCount;
}

/** Which seat holds book `book` in `round`. */
export function seatForBook(book: number, round: number, playerCount: number): number {
  return (book + round) % playerCount;
}

export function generateCode(): string {
  // No I, O, 0, 1 so codes are easy to read off a screen
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function pickPrompts<T>(pool: readonly T[], count: number): T[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

export const NO_GUESS = '(no guess)';
export const BLANK_DRAWING = '';

// ---- Shapes returned by GET /api/doodle-relay/state ----

export interface PublicPlayer {
  id: string;
  name: string;
  seat: number;
  isLeader: boolean;
  submitted: boolean;
}

export interface Task {
  kind: 'drawing' | 'guess';
  round: number;
  book: number;
  /** For a drawing: the text to draw. */
  text?: string;
  /** For a guess: the entry id of the drawing to guess (fetch via /entry). */
  drawingEntryId?: string;
  submitted: boolean;
}

export interface RevealStep {
  entryId: string;
  step: number;
  kind: EntryKind;
  authorName: string | null;
  /** Text for prompts and guesses; drawings are fetched by id. */
  text?: string;
}

export interface RevealState {
  book: number;
  step: number;
  bookCount: number;
  ownerName: string;
  steps: RevealStep[];
}

export interface StateResponse {
  code: string;
  status: 'lobby' | 'playing' | 'reveal';
  gameNumber: number;
  round: number;
  totalRounds: number;
  timerSeconds: number;
  roundStartedAt: string | null;
  serverNow: string;
  players: PublicPlayer[];
  me: PublicPlayer | null;
  task: Task | null;
  reveal: RevealState | null;
}
