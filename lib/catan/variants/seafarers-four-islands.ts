import {
    RNG_OFFSET,
    templateLayout,
    templatePortAnchors,
    shuffledPortPool,
    type BoardTemplate,
} from '../layouts';
import { repeat } from '../random';
import type { BoardVariant, GenerationContext, PortTypeId, TileTypeId } from '../types';
import { SEAFARERS_DISPLAY, SEAFARERS_ROWS } from './seafarers-common';

/**
 * Seafarers — "4 Islands".
 *
 * There is no mainland: each board is one of several hand-authored island
 * arrangements. A template pairs the land hexes with the harbours that belong
 * to that arrangement, so the two can never drift apart.
 *
 * ---------------------------------------------------------------------------
 * TO ADD A NEW ARRANGEMENT
 * ---------------------------------------------------------------------------
 * Append a `{ land, ports }` entry to the relevant template list. `land` holds
 * 1-based hex indices in board reading order; each port names a hex and which
 * side of it the boat moors against.
 *
 * These boards draw no coastline. To outline every island, add:
 *     coastlines: [{ id: 'islands', weight: 'island', region: 'land' }]
 * — the shapes are derived from whichever template comes up.
 */

const THREE_PLAYER_TEMPLATES: BoardTemplate[] = [
    {
        land: [4, 5, 6, 8, 9, 10, 11, 13, 14, 15, 23, 24, 27, 28, 29, 30, 32, 33, 34, 37],
        ports: [
            { hex: 23, side: 'sw' },
            { hex: 34, side: 'e' },
            { hex: 37, side: 'sw' },
            { hex: 27, side: 'w' },
            { hex: 5, side: 'nw' },
            { hex: 11, side: 'se' },
            { hex: 4, side: 'ne' },
            { hex: 15, side: 'ne' },
            { hex: 13, side: 'sw' },
        ],
    },
    {
        land: [1, 4, 5, 6, 8, 9, 10, 13, 14, 15, 23, 24, 27, 28, 29, 30, 32, 33, 34, 37],
        ports: [
            { hex: 34, side: 'sw' },
            { hex: 23, side: 'nw' },
            { hex: 10, side: 'w' },
            { hex: 6, side: 'ne' },
            { hex: 4, side: 'ne' },
            { hex: 15, side: 'e' },
            { hex: 13, side: 'sw' },
            { hex: 37, side: 'sw' },
            { hex: 28, side: 'e' },
        ],
    },
    {
        land: [1, 4, 5, 6, 8, 9, 10, 11, 14, 15, 23, 24, 27, 28, 29, 30, 32, 33, 34, 37],
        ports: [
            { hex: 34, side: 'se' },
            { hex: 23, side: 'w' },
            { hex: 10, side: 'w' },
            { hex: 6, side: 'ne' },
            { hex: 4, side: 'ne' },
            { hex: 15, side: 'e' },
            { hex: 14, side: 'w' },
            { hex: 28, side: 'e' },
            { hex: 37, side: 'sw' },
        ],
    },
];

const FOUR_PLAYER_TEMPLATES: BoardTemplate[] = [
    {
        land: [1, 3, 4, 5, 6, 8, 9, 10, 11, 13, 14, 15, 18, 23, 27, 28, 29, 30, 32, 33, 34, 36, 37],
        ports: [
            { hex: 1, side: 'w' },
            { hex: 10, side: 'w' },
            { hex: 18, side: 'se' },
            { hex: 9, side: 'ne' },
            { hex: 13, side: 'se' },
            { hex: 23, side: 'sw' },
            { hex: 30, side: 'e' },
            { hex: 36, side: 'sw' },
            { hex: 33, side: 'se' },
        ],
    },
    {
        land: [1, 3, 4, 5, 6, 8, 9, 10, 11, 12, 14, 15, 23, 24, 27, 28, 29, 30, 32, 33, 34, 35, 37],
        ports: [
            { hex: 1, side: 'nw' },
            { hex: 10, side: 'w' },
            { hex: 4, side: 'e' },
            { hex: 14, side: 'sw' },
            { hex: 28, side: 'e' },
            { hex: 27, side: 'w' },
            { hex: 37, side: 'sw' },
            { hex: 30, side: 'ne' },
            { hex: 23, side: 'sw' },
        ],
    },
    {
        land: [1, 2, 4, 5, 6, 8, 9, 10, 11, 12, 14, 15, 19, 23, 27, 28, 29, 30, 32, 33, 34, 35, 37],
        ports: [
            { hex: 5, side: 'w' },
            { hex: 10, side: 'sw' },
            { hex: 19, side: 'ne' },
            { hex: 9, side: 'e' },
            { hex: 14, side: 'sw' },
            { hex: 28, side: 'e' },
            { hex: 37, side: 'sw' },
            { hex: 30, side: 'nw' },
            { hex: 29, side: 'sw' },
        ],
    },
    {
        land: [1, 2, 4, 5, 6, 8, 9, 11, 10, 12, 14, 15, 19, 23, 24, 27, 28, 29, 30, 32, 33, 34, 36],
        ports: [
            { hex: 1, side: 'w' },
            { hex: 10, side: 'w' },
            { hex: 12, side: 'sw' },
            { hex: 4, side: 'e' },
            { hex: 15, side: 'se' },
            { hex: 28, side: 'e' },
            { hex: 36, side: 'sw' },
            { hex: 23, side: 'sw' },
            { hex: 34, side: 'e' },
        ],
    },
    {
        land: [1, 2, 4, 5, 6, 8, 9, 11, 10, 15, 20, 23, 24, 25, 27, 28, 29, 30, 32, 33, 34, 36, 37],
        ports: [
            { hex: 10, side: 'w' },
            { hex: 2, side: 'e' },
            { hex: 15, side: 'e' },
            { hex: 4, side: 'ne' },
            { hex: 24, side: 'ne' },
            { hex: 23, side: 'w' },
            { hex: 34, side: 'sw' },
            { hex: 28, side: 'e' },
            { hex: 37, side: 'sw' },
        ],
    },
    {
        land: [1, 2, 4, 5, 6, 8, 9, 10, 14, 15, 18, 23, 24, 25, 27, 28, 29, 30, 32, 33, 34, 35, 37],
        ports: [
            { hex: 18, side: 'e' },
            { hex: 5, side: 'w' },
            { hex: 2, side: 'ne' },
            { hex: 4, side: 'e' },
            { hex: 14, side: 'sw' },
            { hex: 23, side: 'w' },
            { hex: 34, side: 'e' },
            { hex: 28, side: 'e' },
            { hex: 36, side: 'sw' },
        ],
    },
    {
        land: [1, 2, 4, 5, 6, 8, 9, 10, 11, 12, 14, 15, 18, 23, 27, 28, 29, 30, 32, 33, 34, 36, 37],
        ports: [
            { hex: 1, side: 'w' },
            { hex: 10, side: 'sw' },
            { hex: 18, side: 'e' },
            { hex: 4, side: 'e' },
            { hex: 14, side: 'sw' },
            { hex: 23, side: 'w' },
            { hex: 30, side: 'ne' },
            { hex: 28, side: 'e' },
            { hex: 37, side: 'sw' },
        ],
    },
    {
        land: [1, 2, 4, 5, 6, 8, 9, 10, 11, 13, 14, 15, 23, 24, 25, 27, 28, 29, 30, 32, 33, 34, 35],
        ports: [
            { hex: 5, side: 'nw' },
            { hex: 11, side: 'e' },
            { hex: 4, side: 'ne' },
            { hex: 14, side: 'sw' },
            { hex: 28, side: 'e' },
            { hex: 32, side: 'se' },
            { hex: 25, side: 'ne' },
            { hex: 23, side: 'sw' },
            { hex: 34, side: 'sw' },
        ],
    },
];

const SIX_PLAYER_TEMPLATES: BoardTemplate[] = [
    {
        land: [
            1, 2, 8, 9, 17, 4, 11, 12, 20, 19, 21, 6, 7, 14, 15, 35,
            36, 44, 45, 52, 53, 55, 47, 39, 38, 23, 48, 57, 58, 50, 51, 43,
        ],
        ports: [
            { hex: 8, side: 'w' },
            { hex: 17, side: 'se' },
            { hex: 11, side: 'w' },
            { hex: 21, side: 'sw' },
            { hex: 7, side: 'e' },
            { hex: 43, side: 'se' },
            { hex: 57, side: 'sw' },
            { hex: 39, side: 'e' },
            { hex: 55, side: 'w' },
            { hex: 36, side: 'e' },
            { hex: 44, side: 'w' },
        ],
    },
    {
        land: [
            1, 2, 8, 9, 18, 4, 5, 11, 12, 20, 7, 14, 15, 23, 24, 35,
            36, 44, 45, 52, 53, 55, 56, 47, 48, 38, 39, 58, 50, 51, 43, 42,
        ],
        ports: [
            { hex: 1, side: 'nw' },
            { hex: 8, side: 'sw' },
            { hex: 5, side: 'nw' },
            { hex: 20, side: 'e' },
            { hex: 7, side: 'ne' },
            { hex: 24, side: 'e' },
            { hex: 51, side: 'e' },
            { hex: 56, side: 'sw' },
            { hex: 38, side: 'nw' },
            { hex: 35, side: 'w' },
            { hex: 53, side: 'sw' },
        ],
    },
    {
        land: [
            1, 2, 8, 9, 17, 4, 5, 11, 12, 20, 7, 14, 15, 23, 24, 21,
            36, 44, 45, 52, 53, 55, 56, 47, 48, 38, 39, 58, 50, 51, 43, 42,
        ],
        ports: [
            { hex: 8, side: 'w' },
            { hex: 4, side: 'nw' },
            { hex: 21, side: 'sw' },
            { hex: 7, side: 'ne' },
            { hex: 24, side: 'sw' },
            { hex: 42, side: 'w' },
            { hex: 58, side: 'se' },
            { hex: 56, side: 'ne' },
            { hex: 38, side: 'ne' },
            { hex: 36, side: 'w' },
            { hex: 52, side: 'se' },
        ],
    },
    {
        land: [
            1, 2, 8, 9, 17, 4, 11, 12, 20, 19, 16, 6, 7, 14, 15, 35,
            36, 44, 45, 52, 23, 55, 47, 39, 38, 54, 48, 57, 58, 50, 51, 42,
        ],
        ports: [
            { hex: 8, side: 'w' },
            { hex: 17, side: 'se' },
            { hex: 4, side: 'e' },
            { hex: 7, side: 'ne' },
            { hex: 23, side: 'e' },
            { hex: 42, side: 'e' },
            { hex: 58, side: 'sw' },
            { hex: 38, side: 'nw' },
            { hex: 54, side: 'sw' },
            { hex: 35, side: 'sw' },
            { hex: 52, side: 'e' },
        ],
    },
    {
        land: [
            1, 40, 8, 9, 17, 4, 11, 12, 20, 19, 16, 6, 7, 14, 15, 35,
            36, 44, 45, 52, 23, 22, 47, 39, 38, 54, 48, 57, 58, 50, 51, 42,
        ],
        ports: [
            { hex: 8, side: 'w' },
            { hex: 17, side: 'se' },
            { hex: 4, side: 'e' },
            { hex: 7, side: 'ne' },
            { hex: 23, side: 'e' },
            { hex: 42, side: 'e' },
            { hex: 58, side: 'sw' },
            { hex: 38, side: 'nw' },
            { hex: 54, side: 'sw' },
            { hex: 35, side: 'sw' },
            { hex: 52, side: 'e' },
        ],
    },
];

/** Standard 9-harbour bag: one of each resource plus four generic ports. */
const STANDARD_PORTS: PortTypeId[] = [
    'sheep_2-1', 'wood_2-1', 'rock_2-1', 'brick_2-1', 'wheat_2-1',
    'generic_3-1', 'generic_3-1', 'generic_3-1', 'generic_3-1',
];

/** The larger board adds a second, randomly chosen resource harbour. */
function sixPlayerPorts(ctx: GenerationContext): PortTypeId[] {
    const resourcePorts: PortTypeId[] = [
        'sheep_2-1', 'wood_2-1', 'rock_2-1', 'brick_2-1', 'wheat_2-1',
    ];
    const bonus = ctx.rng.pick(resourcePorts, RNG_OFFSET.fourIslandsPorts);
    return [...resourcePorts, bonus, ...Array<PortTypeId>(5).fill('generic_3-1')];
}

/** Ports are dealt from a stream one step past the bonus-port draw. */
const PORT_SHUFFLE_OFFSET = RNG_OFFSET.fourIslandsPorts + 1;

export const FOUR_ISLANDS_THREE_PLAYER: BoardVariant = {
    id: 'seafarers:4-islands:3',
    expansion: 'seafarers',
    scenario: '4-islands',
    playerCount: 3,
    label: '3 Players',
    rows: SEAFARERS_ROWS.small,
    board: { widthHexes: 7, heightRows: 7 },
    numberDistribution: { 2: 1, 3: 2, 4: 3, 5: 3, 6: 2, 8: 3, 9: 2, 10: 3, 11: 2, 12: 1 },
    layout: templateLayout({
        templates: THREE_PLAYER_TEMPLATES,
        tiles: () =>
            repeat<TileTypeId>([
                ['pasture', 4], ['field', 4], ['forest', 4], ['hill', 4], ['mountain', 4],
            ]),
    }),
    ports: {
        pool: shuffledPortPool(STANDARD_PORTS, PORT_SHUFFLE_OFFSET),
        anchors: templatePortAnchors(THREE_PLAYER_TEMPLATES),
    },
    display: SEAFARERS_DISPLAY.rotated,
};

export const FOUR_ISLANDS_FOUR_PLAYER: BoardVariant = {
    id: 'seafarers:4-islands:4',
    expansion: 'seafarers',
    scenario: '4-islands',
    playerCount: 4,
    label: '4 Players',
    rows: SEAFARERS_ROWS.small,
    board: { widthHexes: 8, heightRows: 7 },
    numberDistribution: { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 1 },
    layout: templateLayout({
        templates: FOUR_PLAYER_TEMPLATES,
        tiles: () =>
            repeat<TileTypeId>([
                ['pasture', 5], ['field', 5], ['forest', 5], ['hill', 4], ['mountain', 4],
            ]),
    }),
    ports: {
        pool: shuffledPortPool(STANDARD_PORTS, PORT_SHUFFLE_OFFSET),
        anchors: templatePortAnchors(FOUR_PLAYER_TEMPLATES),
    },
    display: SEAFARERS_DISPLAY.wide,
};

export const FOUR_ISLANDS_SIX_PLAYER: BoardVariant = {
    id: 'seafarers:4-islands:6',
    expansion: 'seafarers',
    scenario: '4-islands',
    playerCount: 6,
    label: '6 Players',
    rows: SEAFARERS_ROWS.large,
    board: { widthHexes: 10, heightRows: 7 },
    numberDistribution: { 2: 3, 3: 4, 4: 4, 5: 4, 6: 4, 8: 4, 9: 4, 10: 4, 11: 4, 12: 3 },
    layout: templateLayout({
        templates: SIX_PLAYER_TEMPLATES,
        tiles: () =>
            repeat<TileTypeId>([
                ['forest', 7], ['pasture', 7], ['field', 6], ['hill', 6], ['mountain', 6],
            ]),
    }),
    ports: {
        pool: ctx => shuffledPortPool(sixPlayerPorts(ctx), PORT_SHUFFLE_OFFSET)(ctx),
        anchors: templatePortAnchors(SIX_PLAYER_TEMPLATES),
    },
    display: SEAFARERS_DISPLAY.wide,
};

export const FOUR_ISLANDS_VARIANTS = [
    FOUR_ISLANDS_THREE_PLAYER,
    FOUR_ISLANDS_FOUR_PLAYER,
    FOUR_ISLANDS_SIX_PLAYER,
];
