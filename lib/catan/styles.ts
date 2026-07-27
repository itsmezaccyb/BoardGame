import type { OutlineWeight, TileStyleId } from './types';

/**
 * Tile-style registry.
 *
 * ---------------------------------------------------------------------------
 * TO ADD A NEW VISUAL STYLE
 * ---------------------------------------------------------------------------
 * 1. Add an entry to `TILE_STYLES` below.
 * 2. Add matching artwork keys to the tiles in `tiles.ts` and the ports in
 *    `ports.ts` (both are keyed by style id).
 *
 * The style picker in the settings panel is built from this registry, so a new
 * style shows up in the UI automatically.
 */

/** One stroke pass of a coastline. Passes are drawn in array order. */
export interface OutlineLayer {
    stroke: string;
    width: number;
    opacity?: number;
    /** Gaussian blur applied to this pass, for a soft glow. */
    blurStdDeviation?: number;
}

export interface TileStyle {
    id: TileStyleId;
    label: string;
    /** Full-page background behind the board. */
    background: string;
    /** Border drawn around every land hex. */
    tileBorder: {
        stroke: string;
        width: number;
        blurStdDeviation?: number;
    };
    /** Thin outline drawn around every sea hex. */
    waterBorder: {
        stroke: string;
        width: number;
    };
    /** Stroke passes per outline weight. */
    outlines: Record<OutlineWeight, OutlineLayer[]>;
    /** How port boats are drawn. */
    port: {
        /** Boat size as a multiple of hex width. */
        sizeFactor: number;
        /** 'art' uses per-port boat images; 'overlay' stamps a logo on `baseImage`. */
        mode: 'art' | 'overlay';
        baseImage?: string;
        /** Overlay position on the boat, as CSS percentages. */
        logoPosition?: { top: string; left: string };
    };
}

const PARCHMENT = '#E6D7AA';

export const TILE_STYLES: Record<TileStyleId, TileStyle> = {
    classic: {
        id: 'classic',
        label: 'Classic',
        background: '/images/catan_water.png',
        // A single soft-edged stroke. The earlier radial-gradient border is in
        // git history if the layered look is ever wanted back.
        tileBorder: { stroke: PARCHMENT, width: 13, blurStdDeviation: 3 },
        waterBorder: { stroke: '#bfdbfe', width: 1.5 },
        outlines: {
            board: [
                { stroke: PARCHMENT, width: 8, opacity: 0.2 },
                { stroke: PARCHMENT, width: 25, blurStdDeviation: 8 },
            ],
            island: [
                { stroke: PARCHMENT, width: 6, opacity: 0.25 },
                { stroke: PARCHMENT, width: 20, blurStdDeviation: 6 },
            ],
        },
        port: { sizeFactor: 1.4, mode: 'art' },
    },
    simple: {
        id: 'simple',
        label: 'Simple',
        background: '/images/catan_water_style.jpg',
        tileBorder: { stroke: PARCHMENT, width: 13 },
        waterBorder: { stroke: '#bfdbfe', width: 1.5 },
        outlines: {
            board: [{ stroke: PARCHMENT, width: 15 }],
            island: [{ stroke: PARCHMENT, width: 15 }],
        },
        port: {
            sizeFactor: 1.2,
            mode: 'overlay',
            baseImage: '/images/catan_boat_style.png',
            logoPosition: { top: '68%', left: '53%' },
        },
    },
};

export const DEFAULT_TILE_STYLE: TileStyleId = 'classic';

export function getTileStyle(id: TileStyleId): TileStyle {
    return TILE_STYLES[id] ?? TILE_STYLES[DEFAULT_TILE_STYLE];
}

export function listTileStyles(): TileStyle[] {
    return Object.values(TILE_STYLES);
}
