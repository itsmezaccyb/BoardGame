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
 * 1-based hex indices in board reading order; each port names a hex and the
 * two vertices of the edge its boat straddles (0 = top, going clockwise).
 */

const THREE_PLAYER_TEMPLATES: BoardTemplate[] = [
    {
        land: [4, 5, 6, 8, 9, 10, 11, 13, 14, 15, 23, 24, 27, 28, 29, 30, 32, 33, 34, 37],
        ports: [
            { hexIndex: 23, vertex1: 3, vertex2: 4 },
            { hexIndex: 34, vertex1: 1, vertex2: 2 },
            { hexIndex: 37, vertex1: 3, vertex2: 4 },
            { hexIndex: 27, vertex1: 4, vertex2: 5 },
            { hexIndex: 5, vertex1: 5, vertex2: 0 },
            { hexIndex: 11, vertex1: 2, vertex2: 3 },
            { hexIndex: 4, vertex1: 0, vertex2: 1 },
            { hexIndex: 15, vertex1: 0, vertex2: 1 },
            { hexIndex: 13, vertex1: 3, vertex2: 4 },
        ],
    },
    {
        land: [1, 4, 5, 6, 8, 9, 10, 13, 14, 15, 23, 24, 27, 28, 29, 30, 32, 33, 34, 37],
        ports: [
            { hexIndex: 34, vertex1: 3, vertex2: 4 },
            { hexIndex: 23, vertex1: 5, vertex2: 0 },
            { hexIndex: 10, vertex1: 4, vertex2: 5 },
            { hexIndex: 6, vertex1: 0, vertex2: 1 },
            { hexIndex: 4, vertex1: 0, vertex2: 1 },
            { hexIndex: 15, vertex1: 1, vertex2: 2 },
            { hexIndex: 13, vertex1: 3, vertex2: 4 },
            { hexIndex: 37, vertex1: 3, vertex2: 4 },
            { hexIndex: 28, vertex1: 1, vertex2: 2 },
        ],
    },
    {
        land: [1, 4, 5, 6, 8, 9, 10, 11, 14, 15, 23, 24, 27, 28, 29, 30, 32, 33, 34, 37],
        ports: [
            { hexIndex: 34, vertex1: 2, vertex2: 3 },
            { hexIndex: 23, vertex1: 4, vertex2: 5 },
            { hexIndex: 10, vertex1: 4, vertex2: 5 },
            { hexIndex: 6, vertex1: 0, vertex2: 1 },
            { hexIndex: 4, vertex1: 0, vertex2: 1 },
            { hexIndex: 15, vertex1: 1, vertex2: 2 },
            { hexIndex: 14, vertex1: 4, vertex2: 5 },
            { hexIndex: 28, vertex1: 1, vertex2: 2 },
            { hexIndex: 37, vertex1: 3, vertex2: 4 },
        ],
    },
];

const FOUR_PLAYER_TEMPLATES: BoardTemplate[] = [
    {
        land: [1, 3, 4, 5, 6, 8, 9, 10, 11, 13, 14, 15, 18, 23, 27, 28, 29, 30, 32, 33, 34, 36, 37],
        ports: [
            { hexIndex: 1, vertex1: 4, vertex2: 5 },
            { hexIndex: 10, vertex1: 4, vertex2: 5 },
            { hexIndex: 18, vertex1: 2, vertex2: 3 },
            { hexIndex: 9, vertex1: 0, vertex2: 1 },
            { hexIndex: 13, vertex1: 2, vertex2: 3 },
            { hexIndex: 23, vertex1: 3, vertex2: 4 },
            { hexIndex: 30, vertex1: 1, vertex2: 2 },
            { hexIndex: 36, vertex1: 3, vertex2: 4 },
            { hexIndex: 33, vertex1: 2, vertex2: 3 },
        ],
    },
    {
        land: [1, 3, 4, 5, 6, 8, 9, 10, 11, 12, 14, 15, 23, 24, 27, 28, 29, 30, 32, 33, 34, 35, 37],
        ports: [
            { hexIndex: 1, vertex1: 5, vertex2: 0 },
            { hexIndex: 10, vertex1: 4, vertex2: 5 },
            { hexIndex: 4, vertex1: 1, vertex2: 2 },
            { hexIndex: 14, vertex1: 3, vertex2: 4 },
            { hexIndex: 28, vertex1: 1, vertex2: 2 },
            { hexIndex: 27, vertex1: 4, vertex2: 5 },
            { hexIndex: 37, vertex1: 3, vertex2: 4 },
            { hexIndex: 30, vertex1: 0, vertex2: 1 },
            { hexIndex: 23, vertex1: 3, vertex2: 4 },
        ],
    },
    {
        land: [1, 2, 4, 5, 6, 8, 9, 10, 11, 12, 14, 15, 19, 23, 27, 28, 29, 30, 32, 33, 34, 35, 37],
        ports: [
            { hexIndex: 5, vertex1: 4, vertex2: 5 },
            { hexIndex: 10, vertex1: 3, vertex2: 4 },
            { hexIndex: 19, vertex1: 0, vertex2: 1 },
            { hexIndex: 9, vertex1: 1, vertex2: 2 },
            { hexIndex: 14, vertex1: 3, vertex2: 4 },
            { hexIndex: 28, vertex1: 1, vertex2: 2 },
            { hexIndex: 37, vertex1: 3, vertex2: 4 },
            { hexIndex: 30, vertex1: 5, vertex2: 0 },
            { hexIndex: 29, vertex1: 3, vertex2: 4 },
        ],
    },
    {
        land: [1, 2, 4, 5, 6, 8, 9, 11, 10, 12, 14, 15, 19, 23, 24, 27, 28, 29, 30, 32, 33, 34, 36],
        ports: [
            { hexIndex: 1, vertex1: 4, vertex2: 5 },
            { hexIndex: 10, vertex1: 4, vertex2: 5 },
            { hexIndex: 12, vertex1: 3, vertex2: 4 },
            { hexIndex: 4, vertex1: 1, vertex2: 2 },
            { hexIndex: 15, vertex1: 2, vertex2: 3 },
            { hexIndex: 28, vertex1: 1, vertex2: 2 },
            { hexIndex: 36, vertex1: 3, vertex2: 4 },
            { hexIndex: 23, vertex1: 3, vertex2: 4 },
            { hexIndex: 34, vertex1: 1, vertex2: 2 },
        ],
    },
    {
        land: [1, 2, 4, 5, 6, 8, 9, 11, 10, 15, 20, 23, 24, 25, 27, 28, 29, 30, 32, 33, 34, 36, 37],
        ports: [
            { hexIndex: 10, vertex1: 4, vertex2: 5 },
            { hexIndex: 2, vertex1: 1, vertex2: 2 },
            { hexIndex: 15, vertex1: 1, vertex2: 2 },
            { hexIndex: 4, vertex1: 0, vertex2: 1 },
            { hexIndex: 24, vertex1: 0, vertex2: 1 },
            { hexIndex: 23, vertex1: 4, vertex2: 5 },
            { hexIndex: 34, vertex1: 3, vertex2: 4 },
            { hexIndex: 28, vertex1: 1, vertex2: 2 },
            { hexIndex: 37, vertex1: 3, vertex2: 4 },
        ],
    },
    {
        land: [1, 2, 4, 5, 6, 8, 9, 10, 14, 15, 18, 23, 24, 25, 27, 28, 29, 30, 32, 33, 34, 35, 37],
        ports: [
            { hexIndex: 18, vertex1: 1, vertex2: 2 },
            { hexIndex: 5, vertex1: 4, vertex2: 5 },
            { hexIndex: 2, vertex1: 0, vertex2: 1 },
            { hexIndex: 4, vertex1: 1, vertex2: 2 },
            { hexIndex: 14, vertex1: 3, vertex2: 4 },
            { hexIndex: 23, vertex1: 4, vertex2: 5 },
            { hexIndex: 34, vertex1: 1, vertex2: 2 },
            { hexIndex: 28, vertex1: 1, vertex2: 2 },
            { hexIndex: 36, vertex1: 3, vertex2: 4 },
        ],
    },
    {
        land: [1, 2, 4, 5, 6, 8, 9, 10, 11, 12, 14, 15, 18, 23, 27, 28, 29, 30, 32, 33, 34, 36, 37],
        ports: [
            { hexIndex: 1, vertex1: 4, vertex2: 5 },
            { hexIndex: 10, vertex1: 3, vertex2: 4 },
            { hexIndex: 18, vertex1: 1, vertex2: 2 },
            { hexIndex: 4, vertex1: 1, vertex2: 2 },
            { hexIndex: 14, vertex1: 3, vertex2: 4 },
            { hexIndex: 23, vertex1: 4, vertex2: 5 },
            { hexIndex: 30, vertex1: 0, vertex2: 1 },
            { hexIndex: 28, vertex1: 1, vertex2: 2 },
            { hexIndex: 37, vertex1: 3, vertex2: 4 },
        ],
    },
    {
        land: [1, 2, 4, 5, 6, 8, 9, 10, 11, 13, 14, 15, 23, 24, 25, 27, 28, 29, 30, 32, 33, 34, 35],
        ports: [
            { hexIndex: 5, vertex1: 5, vertex2: 0 },
            { hexIndex: 11, vertex1: 1, vertex2: 2 },
            { hexIndex: 4, vertex1: 0, vertex2: 1 },
            { hexIndex: 14, vertex1: 3, vertex2: 4 },
            { hexIndex: 28, vertex1: 1, vertex2: 2 },
            { hexIndex: 32, vertex1: 2, vertex2: 3 },
            { hexIndex: 25, vertex1: 0, vertex2: 1 },
            { hexIndex: 23, vertex1: 3, vertex2: 4 },
            { hexIndex: 34, vertex1: 3, vertex2: 4 },
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
            { hexIndex: 8, vertex1: 4, vertex2: 5 },
            { hexIndex: 17, vertex1: 2, vertex2: 3 },
            { hexIndex: 11, vertex1: 4, vertex2: 5 },
            { hexIndex: 21, vertex1: 3, vertex2: 4 },
            { hexIndex: 7, vertex1: 1, vertex2: 2 },
            { hexIndex: 43, vertex1: 2, vertex2: 3 },
            { hexIndex: 57, vertex1: 3, vertex2: 4 },
            { hexIndex: 39, vertex1: 1, vertex2: 2 },
            { hexIndex: 55, vertex1: 4, vertex2: 5 },
            { hexIndex: 36, vertex1: 1, vertex2: 2 },
            { hexIndex: 44, vertex1: 4, vertex2: 5 },
        ],
    },
    {
        land: [
            1, 2, 8, 9, 18, 4, 5, 11, 12, 20, 7, 14, 15, 23, 24, 35,
            36, 44, 45, 52, 53, 55, 56, 47, 48, 38, 39, 58, 50, 51, 43, 42,
        ],
        ports: [
            { hexIndex: 1, vertex1: 5, vertex2: 0 },
            { hexIndex: 8, vertex1: 3, vertex2: 4 },
            { hexIndex: 5, vertex1: 5, vertex2: 0 },
            { hexIndex: 20, vertex1: 1, vertex2: 2 },
            { hexIndex: 7, vertex1: 0, vertex2: 1 },
            { hexIndex: 24, vertex1: 1, vertex2: 2 },
            { hexIndex: 51, vertex1: 1, vertex2: 2 },
            { hexIndex: 56, vertex1: 3, vertex2: 4 },
            { hexIndex: 38, vertex1: 5, vertex2: 0 },
            { hexIndex: 35, vertex1: 4, vertex2: 5 },
            { hexIndex: 53, vertex1: 3, vertex2: 4 },
        ],
    },
    {
        land: [
            1, 2, 8, 9, 17, 4, 5, 11, 12, 20, 7, 14, 15, 23, 24, 21,
            36, 44, 45, 52, 53, 55, 56, 47, 48, 38, 39, 58, 50, 51, 43, 42,
        ],
        ports: [
            { hexIndex: 8, vertex1: 4, vertex2: 5 },
            { hexIndex: 4, vertex1: 5, vertex2: 0 },
            { hexIndex: 21, vertex1: 3, vertex2: 4 },
            { hexIndex: 7, vertex1: 0, vertex2: 1 },
            { hexIndex: 24, vertex1: 3, vertex2: 4 },
            { hexIndex: 42, vertex1: 4, vertex2: 5 },
            { hexIndex: 58, vertex1: 2, vertex2: 3 },
            { hexIndex: 56, vertex1: 0, vertex2: 1 },
            { hexIndex: 38, vertex1: 0, vertex2: 1 },
            { hexIndex: 36, vertex1: 4, vertex2: 5 },
            { hexIndex: 52, vertex1: 2, vertex2: 3 },
        ],
    },
    {
        land: [
            1, 2, 8, 9, 17, 4, 11, 12, 20, 19, 16, 6, 7, 14, 15, 35,
            36, 44, 45, 52, 23, 55, 47, 39, 38, 54, 48, 57, 58, 50, 51, 42,
        ],
        ports: [
            { hexIndex: 8, vertex1: 4, vertex2: 5 },
            { hexIndex: 17, vertex1: 2, vertex2: 3 },
            { hexIndex: 4, vertex1: 1, vertex2: 2 },
            { hexIndex: 7, vertex1: 0, vertex2: 1 },
            { hexIndex: 23, vertex1: 1, vertex2: 2 },
            { hexIndex: 42, vertex1: 1, vertex2: 2 },
            { hexIndex: 58, vertex1: 3, vertex2: 4 },
            { hexIndex: 38, vertex1: 5, vertex2: 0 },
            { hexIndex: 54, vertex1: 3, vertex2: 4 },
            { hexIndex: 35, vertex1: 3, vertex2: 4 },
            { hexIndex: 52, vertex1: 1, vertex2: 2 },
        ],
    },
    {
        land: [
            1, 40, 8, 9, 17, 4, 11, 12, 20, 19, 16, 6, 7, 14, 15, 35,
            36, 44, 45, 52, 23, 22, 47, 39, 38, 54, 48, 57, 58, 50, 51, 42,
        ],
        ports: [
            { hexIndex: 8, vertex1: 4, vertex2: 5 },
            { hexIndex: 17, vertex1: 2, vertex2: 3 },
            { hexIndex: 4, vertex1: 1, vertex2: 2 },
            { hexIndex: 7, vertex1: 0, vertex2: 1 },
            { hexIndex: 23, vertex1: 1, vertex2: 2 },
            { hexIndex: 42, vertex1: 1, vertex2: 2 },
            { hexIndex: 58, vertex1: 3, vertex2: 4 },
            { hexIndex: 38, vertex1: 5, vertex2: 0 },
            { hexIndex: 54, vertex1: 3, vertex2: 4 },
            { hexIndex: 35, vertex1: 3, vertex2: 4 },
            { hexIndex: 52, vertex1: 1, vertex2: 2 },
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
