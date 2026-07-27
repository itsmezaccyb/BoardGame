import type { SeededRng } from './types';

/**
 * Deterministic pseudo-random helpers.
 *
 * The same board seed must always produce the same board, so every draw goes
 * through here. An `offset` selects an independent stream: two pieces of the
 * generator that use different offsets can be reordered freely without
 * changing each other's output.
 */

function fract(value: number): number {
    return value - Math.floor(value);
}

/** Base generator: a hash of `seed + index` into [0, 1). */
export function seededRandom(seed: number, index: number): number {
    return fract(Math.sin(seed + index) * 10000);
}

export function createRng(seed: number): SeededRng {
    return {
        seed,

        value(offset: number, index: number): number {
            return seededRandom(seed + offset, index);
        },

        shuffle<T>(items: readonly T[], offset: number): T[] {
            const out = [...items];
            for (let i = out.length - 1; i > 0; i--) {
                const j = Math.floor(seededRandom(seed + offset, i) * (i + 1));
                [out[i], out[j]] = [out[j], out[i]];
            }
            return out;
        },

        pick<T>(items: readonly T[], offset: number): T {
            return items[this.index(items.length, offset)];
        },

        index(count: number, offset: number): number {
            if (count <= 0) return 0;
            return Math.min(count - 1, Math.floor(seededRandom(seed + offset, 0) * count));
        },

        stream(offset: number): () => number {
            let cursor = seed + offset;
            return () => fract(Math.sin(cursor++) * 10000);
        },
    };
}

/** Expands `{ forest: 2, hill: 1 }` into `['forest', 'forest', 'hill']`. */
export function expandCounts<T extends string>(counts: Partial<Record<T, number>>): T[] {
    const out: T[] = [];
    (Object.entries(counts) as Array<[T, number]>).forEach(([id, count]) => {
        for (let i = 0; i < count; i++) out.push(id);
    });
    return out;
}

/** Builds an array by repeating each entry of `[value, count]` pairs. */
export function repeat<T>(pairs: Array<[T, number]>): T[] {
    const out: T[] = [];
    pairs.forEach(([value, count]) => {
        for (let i = 0; i < count; i++) out.push(value);
    });
    return out;
}
