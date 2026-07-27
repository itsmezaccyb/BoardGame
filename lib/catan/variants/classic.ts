import { RNG_OFFSET, fixedPortAnchors, shuffledLayout, shuffledPortPool } from '../layouts';
import type { BoardVariant, CoastlineSpec } from '../types';

/**
 * Classic Catan — a single land mass with harbours around the rim.
 */

const DISPLAY: BoardVariant['display'] = {
    tileRender: 'cover',
    barbarianTrack: { orientation: 'left', topOffset: '50%' },
};

/** The whole board is land, so the coastline is simply its rim. */
const BOARD_COASTLINE: CoastlineSpec = { id: 'board', weight: 'board', region: 'land' };

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
    coastlines: [BOARD_COASTLINE],
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
        anchors: fixedPortAnchors([
            { hex: 1, side: 'nw' },
            { hex: 2, side: 'ne' },
            { hex: 7, side: 'ne' },
            { hex: 12, side: 'e' },
            { hex: 16, side: 'se' },
            { hex: 18, side: 'se' },
            { hex: 17, side: 'sw' },
            { hex: 13, side: 'w' },
            { hex: 4, side: 'w' },
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
    coastlines: [BOARD_COASTLINE],
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
        anchors: fixedPortAnchors([
            { hex: 2, side: 'nw' },
            { hex: 4, side: 'ne' },
            { hex: 9, side: 'e' },
            { hex: 21, side: 'e' },
            { hex: 30, side: 'se' },
            { hex: 29, side: 'sw' },
            { hex: 27, side: 'se' },
            { hex: 22, side: 'sw' },
            { hex: 16, side: 'w' },
            { hex: 10, side: 'nw' },
            { hex: 1, side: 'w' },
        ]),
    },
    display: { ...DISPLAY, verticalOffsetRows: -0.5 },
};

export const CLASSIC_VARIANTS = [CLASSIC_FOUR_PLAYER, CLASSIC_SIX_PLAYER];
