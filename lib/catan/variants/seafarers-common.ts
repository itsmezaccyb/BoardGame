import type { RowConfig, VariantDisplay } from '../types';

/**
 * Board shapes and presentation shared by the Seafarers scenarios.
 */

function pyramid(counts: number[]): RowConfig[] {
    // Rows are centred on the widest one, so each step out is nudged half a hex.
    const widest = Math.max(...counts);
    return counts.map(count => ({ count, offset: (widest - count) / 2 }));
}

export const SEAFARERS_ROWS = {
    /** 37 hexes — 4-5-6-7-6-5-4. */
    small: pyramid([4, 5, 6, 7, 6, 5, 4]),
    /** 44 hexes — 5-6-7-8-7-6-5. */
    medium: pyramid([5, 6, 7, 8, 7, 6, 5]),
    /** 58 hexes — 7-8-9-10-9-8-7. */
    large: pyramid([7, 8, 9, 10, 9, 8, 7]),
} satisfies Record<string, RowConfig[]>;

const BASE: VariantDisplay = {
    // Seafarers artwork is authored a quarter-turn round from the classic set,
    // so tiles are counter-rotated inside the hex and tokens rotated back.
    tileRender: 'rotated',
    numberTokenRotationDeg: -90,
};

export const SEAFARERS_DISPLAY = {
    /** Tall boards are turned on their side to fit the screen. */
    rotated: {
        ...BASE,
        rotateDeg: 90,
        marginTopInches: 0.625,
        barbarianTrack: { orientation: 'below' as const },
    },
    /** Wide boards sit upright with the barbarian track alongside. */
    wide: {
        ...BASE,
        marginTopInches: 3.5,
        barbarianTrack: { orientation: 'left' as const, topOffset: 'calc(50% - 40px)' },
    },
} satisfies Record<string, VariantDisplay>;
