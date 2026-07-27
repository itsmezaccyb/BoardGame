import { RNG_OFFSET, islandLayout, outlinePortAnchors, shuffledPortPool } from '../layouts';
import { repeat } from '../random';
import type { BoardVariant, GenerationContext, OutlineSpec, TileTypeId } from '../types';
import { SEAFARERS_DISPLAY, SEAFARERS_ROWS } from './seafarers-common';

/**
 * Seafarers — "Heading for New Shores".
 *
 * One large mainland with a traced coastline, plus small islands scattered in
 * the surrounding sea that hold the gold fields.
 */

/** The five terrain types that make up an ordinary resource spread. */
const RESOURCE_TILES: TileTypeId[] = ['forest', 'pasture', 'field', 'hill', 'mountain'];

const MAINLAND_OUTLINE = (trace: OutlineSpec['trace']): OutlineSpec => ({
    id: 'mainland',
    weight: 'island',
    trace,
});

// --------------------------------------------------------------------------
// 3 players
// --------------------------------------------------------------------------

export const NEW_SHORES_THREE_PLAYER: BoardVariant = {
    id: 'seafarers:heading-for-new-shores:3',
    expansion: 'seafarers',
    scenario: 'heading-for-new-shores',
    playerCount: 3,
    label: '3 Players',
    rows: SEAFARERS_ROWS.small,
    board: { widthHexes: 7, heightRows: 7 },
    numberDistribution: { 2: 1, 3: 2, 4: 3, 5: 3, 6: 2, 8: 3, 9: 2, 10: 3, 11: 2, 12: 1 },
    layout: islandLayout({
        mainland: [3, 4, 7, 8, 9, 12, 13, 14, 15, 19, 20, 21, 26, 27],
        openSea: [2, 6, 11, 16, 18, 22, 25, 28, 31, 32, 33],
        smallIslandSeaCount: 4,
        // One of field/hill/mountain gets a third mainland tile; the other two
        // are pushed out to the small islands.
        mainlandTiles: ctx => [
            ...repeat<TileTypeId>([
                ['pasture', 4],
                ['field', 2],
                ['hill', 2],
                ['mountain', 2],
                ['forest', 3],
            ]),
            floatingTile(ctx),
        ],
        smallIslandTiles: ctx => [
            'gold', 'gold',
            'field', 'hill', 'mountain', 'pasture',
            ...otherFloatingTiles(ctx),
        ],
    }),
    outlines: [
        MAINLAND_OUTLINE([
            [0, 2, 5], [0, 2, 0], [0, 2, 1],
            [0, 3, 0], [0, 3, 1], [0, 3, 2],
            [1, 4, 1], [1, 4, 2],
            [2, 5, 1], [2, 5, 2], [2, 5, 3],
            [3, 5, 2], [3, 5, 3],
            [4, 5, 4],
            [4, 4, 3], [4, 4, 4],
            [4, 3, 3], [4, 3, 4], [4, 3, 5],
            [3, 3, 4], [3, 3, 5],
            [3, 2, 0],
            [2, 2, 5], [2, 2, 0],
            [1, 2, 5],
            [0, 2, 4],
        ]),
    ],
    ports: {
        pool: shuffledPortPool(
            [
                'brick_2-1', 'sheep_2-1', 'rock_2-1', 'wood_2-1', 'wheat_2-1',
                'generic_3-1', 'generic_3-1', 'generic_3-1',
            ],
            RNG_OFFSET.islandPorts
        ),
        anchors: outlinePortAnchors('mainland', [
            [25, 0], [1, 2], [4, 5], [7, 8], [12, 13], [17, 18], [20, 21],
        ]),
    },
    display: SEAFARERS_DISPLAY.rotated,
};

/** The terrain that gets an extra mainland tile on the 3-player board. */
function floatingTile(ctx: GenerationContext): TileTypeId {
    return ctx.rng.pick(['field', 'hill', 'mountain'], RNG_OFFSET.tileVariation);
}

/** The two terrains that lost the draw, which move to the small islands. */
function otherFloatingTiles(ctx: GenerationContext): TileTypeId[] {
    const chosen = floatingTile(ctx);
    return ['field', 'hill', 'mountain'].filter(tile => tile !== chosen);
}

// --------------------------------------------------------------------------
// 4 players
// --------------------------------------------------------------------------

/**
 * On the 4-player board the exact resource split is randomised: every terrain
 * starts with 3 mainland / 1 small-island tile, then three terrains get a
 * bonus mainland tile and two get a bonus small-island tile.
 */
function fourPlayerSplit(ctx: GenerationContext) {
    const mainland: Record<string, number> = {};
    const smallIsland: Record<string, number> = {};
    RESOURCE_TILES.forEach(tile => {
        mainland[tile] = 3;
        smallIsland[tile] = 1;
    });

    const order = ctx.rng.shuffle(RESOURCE_TILES, RNG_OFFSET.resourceSplit);
    order.slice(0, 3).forEach(tile => (mainland[tile] += 1));
    order.slice(3, 5).forEach(tile => (smallIsland[tile] += 1));

    return { mainland, smallIsland };
}

export const NEW_SHORES_FOUR_PLAYER: BoardVariant = {
    id: 'seafarers:heading-for-new-shores:4',
    expansion: 'seafarers',
    scenario: 'heading-for-new-shores',
    playerCount: 4,
    label: '4 Players',
    rows: SEAFARERS_ROWS.medium,
    board: { widthHexes: 8, heightRows: 7 },
    numberDistribution: { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 1 },
    layout: islandLayout({
        mainland: [3, 4, 5, 8, 9, 10, 11, 14, 15, 16, 17, 18, 22, 23, 24, 25, 30, 31, 32],
        openSea: [2, 7, 13, 19, 21, 26, 29, 33, 36, 37, 38, 39],
        smallIslands: [1, 6, 12, 20, 27, 28, 34, 35, 40, 41, 42, 43, 44],
        smallIslandSeaCount: 4,
        mainlandTiles: ctx => {
            const { mainland } = fourPlayerSplit(ctx);
            return [
                'desert',
                ...RESOURCE_TILES.flatMap(tile => Array<TileTypeId>(mainland[tile]).fill(tile)),
            ];
        },
        smallIslandTiles: ctx => {
            const { smallIsland } = fourPlayerSplit(ctx);
            return [
                'gold', 'gold',
                ...RESOURCE_TILES.flatMap(tile => Array<TileTypeId>(smallIsland[tile]).fill(tile)),
            ];
        },
    }),
    outlines: [
        MAINLAND_OUTLINE([
            [0, 2, 5], [0, 2, 0], [0, 2, 1],
            [0, 3, 0], [0, 3, 1],
            [0, 4, 0], [0, 4, 1], [0, 4, 2],
            [1, 5, 1], [1, 5, 2],
            [2, 6, 1], [2, 6, 2], [2, 6, 3],
            [3, 7, 4],
            [3, 6, 3],
            [4, 6, 4],
            // Deliberately off-board: kept so the traced loop keeps its
            // historical point indices, which the port anchors below rely on.
            [5, 6, 3],
            [4, 5, 3],
            [4, 4, 2], [4, 4, 3],
            [4, 3, 2], [4, 3, 3], [4, 3, 4], [4, 3, 5],
            [3, 3, 4], [3, 3, 5],
            [2, 2, 4], [2, 2, 5], [2, 2, 0],
            [1, 2, 5],
            [0, 2, 4],
        ]),
    ],
    ports: {
        pool: shuffledPortPool(
            [
                'brick_2-1', 'sheep_2-1', 'rock_2-1', 'wood_2-1', 'wheat_2-1',
                'generic_3-1', 'generic_3-1', 'generic_3-1', 'generic_3-1',
            ],
            RNG_OFFSET.islandPorts
        ),
        anchors: outlinePortAnchors('mainland', [
            [2, 3], [5, 6], [8, 9], [12, 13], [15, 16],
            [18, 19], [22, 23], [25, 26], [28, 29],
        ]),
    },
    display: SEAFARERS_DISPLAY.wide,
};

// --------------------------------------------------------------------------
// 6 players
// --------------------------------------------------------------------------

export const NEW_SHORES_SIX_PLAYER: BoardVariant = {
    id: 'seafarers:heading-for-new-shores:6',
    expansion: 'seafarers',
    scenario: 'heading-for-new-shores',
    playerCount: 6,
    label: '6 Players',
    rows: SEAFARERS_ROWS.large,
    board: { widthHexes: 10, heightRows: 7 },
    numberDistribution: { 2: 3, 3: 4, 4: 4, 5: 4, 6: 4, 8: 4, 9: 4, 10: 4, 11: 4, 12: 3 },
    layout: islandLayout({
        mainland: [
            3, 4, 5, 10, 11, 12, 13, 18, 19, 20, 21, 22, 27, 28, 29, 30,
            31, 32, 37, 38, 39, 40, 41, 46, 47, 48, 49, 54, 55, 56,
        ],
        openSea: [2, 6, 9, 14, 17, 23, 25, 26, 33, 34, 36, 42, 45, 50, 53, 57],
        smallIslandSeaCount: 2,
        mainlandTiles: () =>
            repeat<TileTypeId>([
                ['desert', 2],
                ['mountain', 5],
                ['hill', 5],
                ['pasture', 6],
                ['forest', 6],
                ['field', 6],
            ]),
        smallIslandTiles: () =>
            repeat<TileTypeId>([
                ['gold', 3],
                ['mountain', 2],
                ['hill', 2],
                ['pasture', 1],
                ['forest', 1],
                ['field', 1],
            ]),
    }),
    outlines: [
        MAINLAND_OUTLINE([
            [0, 2, 5], [0, 2, 0], [0, 2, 1],
            [0, 3, 0], [0, 3, 1],
            [0, 4, 0], [0, 4, 1], [0, 4, 2],
            [1, 5, 1], [1, 5, 2],
            [2, 6, 1], [2, 6, 2],
            [3, 7, 1], [3, 7, 2], [3, 7, 3],
            [4, 7, 4],
            [4, 6, 3],
            [5, 5, 2], [5, 5, 3],
            [6, 4, 2], [6, 4, 3], [6, 4, 4],
            [6, 3, 3], [6, 3, 4],
            [6, 2, 3], [6, 2, 4], [6, 2, 5],
            [5, 2, 4], [5, 2, 5],
            [4, 2, 4], [4, 2, 5],
            [3, 2, 4], [3, 2, 5],
            [2, 2, 4], [2, 2, 5],
            [1, 2, 4], [1, 2, 5],
            [0, 2, 4],
        ]),
    ],
    ports: {
        pool: shuffledPortPool(
            [
                'wood_2-1', 'wheat_2-1', 'rock_2-1', 'brick_2-1', 'sheep_2-1', 'sheep_2-1',
                'generic_3-1', 'generic_3-1', 'generic_3-1', 'generic_3-1', 'generic_3-1',
            ],
            RNG_OFFSET.islandPorts
        ),
        anchors: outlinePortAnchors('mainland', [
            [3, 4], [7, 8], [10, 11], [13, 14], [16, 17], [19, 20],
            [22, 23], [26, 27], [30, 31], [33, 34], [36, 37],
        ]),
    },
    display: SEAFARERS_DISPLAY.wide,
};

export const NEW_SHORES_VARIANTS = [
    NEW_SHORES_THREE_PLAYER,
    NEW_SHORES_FOUR_PLAYER,
    NEW_SHORES_SIX_PLAYER,
];
