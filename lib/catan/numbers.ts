import { indexToRowCol, neighbors, rowColToIndex } from './hex-geometry';
import { takesNumberToken } from './tiles';
import type { Hex, RowConfig, SeededRng } from './types';

/**
 * Dice-number placement.
 *
 * Which numbers exist and how many of each is variant data; the placement rule
 * (no two red numbers touching) lives here.
 */

/** Numbers considered "red" — high probability, and never placed adjacently. */
export const HIGH_PROBABILITY_NUMBERS = [6, 8];

/** Probability pips shown under a number token. */
export function getDotCount(value: number): number {
    // Each step away from 7 removes one rolling combination. 7 itself is the
    // robber and never gets a token, so it shows no pips.
    if (value === 7) return 0;
    return Math.max(0, 6 - Math.abs(7 - value));
}

export function isHighProbability(value: number | undefined): boolean {
    return value !== undefined && HIGH_PROBABILITY_NUMBERS.includes(value);
}

/** Expands `{ 6: 2, 8: 2 }` into `[6, 6, 8, 8]`. */
export function buildNumberPool(distribution: Record<number, number>): number[] {
    const pool: number[] = [];
    Object.entries(distribution).forEach(([value, count]) => {
        for (let i = 0; i < count; i++) pool.push(Number(value));
    });
    return pool;
}

function violatesAdjacency(
    value: number,
    row: number,
    col: number,
    hexes: Hex[],
    rows: readonly RowConfig[]
): boolean {
    if (!isHighProbability(value)) return false;
    return neighbors(rows, row, col).some(({ row: r, col: c }) =>
        isHighProbability(hexes[rowColToIndex(rows, r, c)]?.number)
    );
}

/**
 * Deals `pool` out to every hex that takes a token, swapping numbers forward
 * when a placement would put two red numbers side by side.
 *
 * Returns false when it paints itself into a corner, so the caller can reshuffle.
 */
function tryAssign(hexes: Hex[], pool: number[], rows: readonly RowConfig[]): boolean {
    const targets = hexes.filter(hex => takesNumberToken(hex.tileType));
    let cursor = 0;

    for (const hex of targets) {
        const coords = indexToRowCol(rows, hex.index);
        if (!coords) {
            hex.number = pool[cursor++];
            continue;
        }

        let placed = false;
        for (let attempt = 0; attempt + cursor < pool.length; attempt++) {
            const candidate = pool[cursor + attempt];
            hex.number = candidate;

            if (violatesAdjacency(candidate, coords.row, coords.col, hexes, rows)) {
                hex.number = undefined;
                continue;
            }

            // Bring the number that worked to the front of the remaining pool.
            if (attempt > 0) {
                [pool[cursor], pool[cursor + attempt]] = [pool[cursor + attempt], pool[cursor]];
            }
            cursor++;
            placed = true;
            break;
        }

        if (!placed) return false;
    }

    return true;
}

const MAX_SHUFFLE_ATTEMPTS = 100;

/** Assigns number tokens in place, reshuffling until the constraints hold. */
export function assignNumbers(
    hexes: Hex[],
    rows: readonly RowConfig[],
    distribution: Record<number, number>,
    rng: SeededRng,
    baseOffset = 1000
): void {
    const basePool = buildNumberPool(distribution);

    for (let attempt = 0; attempt < MAX_SHUFFLE_ATTEMPTS; attempt++) {
        const pool = rng.shuffle(basePool, baseOffset + attempt);
        if (tryAssign(hexes, pool, rows)) return;
        hexes.forEach(hex => {
            if (takesNumberToken(hex.tileType)) hex.number = undefined;
        });
    }

    console.warn('Could not place number tokens without adjacent 6/8 after retries');
}

const NUMBER_VALUES = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];
/** Classic Catan proportions: the extremes appear half as often. */
const NUMBER_WEIGHTS = [1, 2, 2, 2, 2, 2, 2, 2, 2, 1];

/**
 * Spreads `count` number tokens across 2-12 in classic proportions.
 *
 * Uses largest-remainder allocation so the totals always add up exactly,
 * whatever the board size.
 */
export function buildNumberDistribution(count: number): Record<number, number> {
    const total = NUMBER_WEIGHTS.reduce((sum, w) => sum + w, 0);
    const exact = NUMBER_WEIGHTS.map(weight => (count * weight) / total);
    const allocation = exact.map(Math.floor);

    let remaining = count - allocation.reduce((sum, n) => sum + n, 0);
    // Hand out the leftovers to whichever numbers were rounded down hardest,
    // preferring the middle of the range so 6s and 8s stay placeable.
    const order = exact
        .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
        .sort((a, b) => b.remainder - a.remainder || Math.abs(4.5 - a.index) - Math.abs(4.5 - b.index));

    for (let i = 0; remaining > 0; i = (i + 1) % order.length) {
        allocation[order[i].index] += 1;
        remaining -= 1;
    }

    const distribution: Record<number, number> = {};
    NUMBER_VALUES.forEach((value, index) => {
        if (allocation[index] > 0) distribution[value] = allocation[index];
    });
    return distribution;
}
