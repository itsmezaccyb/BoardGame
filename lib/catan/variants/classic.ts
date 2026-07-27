import { RNG_OFFSET, outlinePortAnchors, shuffledLayout, shuffledPortPool } from '../layouts';
import type { BoardVariant, OutlineSpec } from '../types';

/**
 * Classic Catan — a single land mass with harbours around the rim.
 */

const DISPLAY: BoardVariant['display'] = {
    tileRender: 'cover',
    barbarianTrack: { orientation: 'left', topOffset: '50%' },
};

/** Coastline of the 3-4-5-4-3 board, traced clockwise from the top-left hex. */
const FOUR_PLAYER_OUTLINE: OutlineSpec = {
    id: 'board',
    weight: 'board',
    trace: [
        // Top edge, left to right.
        [0, 0, 5], [0, 0, 0], [0, 0, 1],
        [0, 1, 0], [0, 1, 1],
        [0, 2, 0], [0, 2, 1], [0, 2, 2],
        // Down the upper right.
        [1, 3, 1], [1, 3, 2],
        [2, 4, 1], [2, 4, 2], [2, 4, 3],
        // Down the lower right.
        [3, 3, 2], [3, 3, 3],
        [4, 2, 2], [4, 2, 3],
        // Bottom edge, right to left.
        [4, 2, 4],
        [4, 1, 3], [4, 1, 4],
        [4, 0, 3], [4, 0, 4], [4, 0, 5],
        // Up the left side.
        [3, 0, 4], [3, 0, 5],
        [2, 0, 4], [2, 0, 5], [2, 0, 0],
        [1, 0, 5],
        [0, 0, 4],
    ],
};

/** Coastline of the wider 4-5-6-6-5-4 board. */
const SIX_PLAYER_OUTLINE: OutlineSpec = {
    id: 'board',
    weight: 'board',
    trace: [
        // Top edge, left to right.
        [0, 0, 5], [0, 0, 0], [0, 0, 1],
        [0, 1, 0], [0, 1, 1],
        [0, 2, 0], [0, 2, 1],
        [0, 3, 0], [0, 3, 1], [0, 3, 2],
        // Down the right side.
        [1, 4, 1], [1, 4, 2],
        [2, 5, 1], [2, 5, 2], [2, 5, 3],
        [3, 5, 2], [3, 5, 3],
        [4, 4, 2], [4, 4, 3],
        [5, 3, 2], [5, 3, 3],
        // Bottom edge, right to left.
        [5, 3, 4],
        [5, 2, 3], [5, 2, 4],
        [5, 1, 3], [5, 1, 4],
        [5, 0, 3], [5, 0, 4], [5, 0, 5],
        // Up the left side.
        [4, 0, 4], [4, 0, 5],
        [3, 0, 4], [3, 0, 5], [3, 0, 0],
        [2, 0, 5], [2, 0, 0],
        [1, 0, 4], [1, 0, 5],
        [0, 0, 4],
    ],
};

export const CLASSIC_FOUR_PLAYER: BoardVariant = {
    id: 'classic:base:4',
    expansion: 'classic',
    playerCount: 4,
    label: '4 Players',
    rows: [
        { count: 3, offset: 1 },
        { count: 4, offset: 0.5 },
        { count: 5, offset: 0 },
        { count: 4, offset: 0.5 },
        { count: 3, offset: 1 },
    ],
    board: { widthHexes: 5, heightRows: 4 },
    numberDistribution: { 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 1 },
    layout: shuffledLayout({
        forest: 4,
        pasture: 4,
        field: 4,
        mountain: 3,
        hill: 3,
        desert: 1,
    }),
    outlines: [FOUR_PLAYER_OUTLINE],
    ports: {
        pool: shuffledPortPool(
            [
                'brick_2-1',
                'sheep_2-1',
                'rock_2-1',
                'wheat_2-1',
                'wood_2-1',
                'generic_3-1',
                'generic_3-1',
                'generic_3-1',
                'generic_3-1',
            ],
            RNG_OFFSET.classicPorts
        ),
        anchors: outlinePortAnchors('board', [
            [0, 1], [3, 4], [7, 8], [10, 11], [13, 14],
            [17, 18], [20, 21], [23, 24], [27, 28],
        ]),
    },
    display: DISPLAY,
};

export const CLASSIC_SIX_PLAYER: BoardVariant = {
    id: 'classic:base:5-6',
    expansion: 'classic',
    playerCount: '5-6',
    label: '5-6 Players',
    rows: [
        { count: 4, offset: 1 },
        { count: 5, offset: 0.5 },
        { count: 6, offset: 0 },
        { count: 6, offset: -0.5 },
        { count: 5, offset: 0 },
        { count: 4, offset: 0.5 },
    ],
    board: { widthHexes: 5, heightRows: 4 },
    numberDistribution: { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 2 },
    layout: shuffledLayout({
        forest: 6,
        pasture: 6,
        field: 6,
        mountain: 5,
        hill: 5,
        desert: 2,
    }),
    outlines: [SIX_PLAYER_OUTLINE],
    ports: {
        pool: shuffledPortPool(
            [
                'brick_2-1',
                'sheep_2-1',
                'rock_2-1',
                'wheat_2-1',
                'wood_2-1',
                'wood_2-1',
                'generic_3-1',
                'generic_3-1',
                'generic_3-1',
                'generic_3-1',
                'generic_3-1',
            ],
            RNG_OFFSET.classicPorts
        ),
        anchors: outlinePortAnchors('board', [
            [2, 3], [7, 8], [10, 11], [14, 15], [19, 20], [22, 23],
            [25, 26], [28, 29], [31, 32], [34, 35], [38, 0],
        ]),
    },
    display: { ...DISPLAY, verticalOffsetRows: -0.5 },
};

export const CLASSIC_VARIANTS = [CLASSIC_FOUR_PLAYER, CLASSIC_SIX_PLAYER];
