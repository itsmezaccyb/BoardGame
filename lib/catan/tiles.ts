import { assetUrl } from '@/lib/asset-url';
import type { ResourceType } from '@/lib/building-costs';
import type { TileStyleId, TileTypeId } from './types';

/**
 * Tile registry.
 *
 * ---------------------------------------------------------------------------
 * TO ADD A NEW TILE TYPE
 * ---------------------------------------------------------------------------
 * 1. Add an entry to `TILE_TYPES` below with artwork for each tile style.
 * 2. Reference its id from a variant's resource pool in `variants/`.
 *
 * That is all. Board generation, number-token eligibility, coastlines and
 * rendering all read this registry, so nothing else needs to change.
 */

export interface TileType {
    id: TileTypeId;
    label: string;
    /** Land tiles get a coastline and a hex border; water tiles do not. */
    category: 'land' | 'water';
    /** Whether this tile takes a dice number token (desert and water do not). */
    producesResource: boolean;
    /** The resource it yields, linking tiles to the building-cost legend. */
    resource?: ResourceType;
    /** Artwork per tile style. A missing entry renders as a plain hex. */
    images: Partial<Record<TileStyleId, string>>;
}

export const TILE_TYPES: Record<TileTypeId, TileType> = {
    forest: {
        id: 'forest',
        label: 'Forest',
        category: 'land',
        producesResource: true,
        resource: 'wood',
        images: {
            classic: '/images/catan_woods.png',
            simple: '/images/catan_wood_style.jpg',
            nights: '/images/catan_woods_nights.png',
        },
    },
    pasture: {
        id: 'pasture',
        label: 'Pasture',
        category: 'land',
        producesResource: true,
        resource: 'sheep',
        images: {
            classic: '/images/catan_sheep.png',
            simple: '/images/catan_sheep_style.jpg',
            nights: '/images/catan_sheep_nights.png',
        },
    },
    field: {
        id: 'field',
        label: 'Field',
        category: 'land',
        producesResource: true,
        resource: 'wheat',
        images: {
            classic: '/images/catan_wheat.png',
            simple: '/images/catan_wheat_style.jpg',
            nights: '/images/catan_wheat_nights.png',
        },
    },
    mountain: {
        id: 'mountain',
        label: 'Mountain',
        category: 'land',
        producesResource: true,
        resource: 'ore',
        images: {
            classic: '/images/catan_rock.png',
            simple: '/images/catan_rock_style.jpg',
            nights: '/images/catan_rock_nights.png',
        },
    },
    hill: {
        id: 'hill',
        label: 'Hill',
        category: 'land',
        producesResource: true,
        resource: 'brick',
        images: {
            classic: '/images/catan_brick.png',
            simple: '/images/catan_brick_style.jpg',
            nights: '/images/catan_brick_nights.png',
        },
    },
    gold: {
        id: 'gold',
        label: 'Gold Field',
        category: 'land',
        producesResource: true,
        images: {
            classic: '/images/catan_gold.jpg',
            simple: '/images/catan_gold_style.png',
            nights: '/images/catan_gold_nights.png',
        },
    },
    desert: {
        id: 'desert',
        label: 'Desert',
        category: 'land',
        producesResource: false,
        images: {
            classic: '/images/catan_desert.png',
            simple: '/images/catan_desert_style.jpg',
            nights: '/images/catan_desert_nights.png',
        },
    },
    fog: {
        id: 'fog',
        label: 'Fog',
        // Fog is a cover rather than terrain: it is never the tile a hex ends
        // up as, only what is drawn over one until it is turned face-up. The
        // registry entry exists so the artwork resolves like any other tile.
        category: 'land',
        producesResource: false,
        images: {
            classic: '/images/catan_fog.png',
            simple: '/images/catan_fog_style.png',
            nights: '/images/catan_fog_nights.png',
        },
    },
    water: {
        id: 'water',
        label: 'Sea',
        category: 'water',
        producesResource: false,
        images: {},
    },
};

/** The tile used wherever a variant leaves a hex unspecified. */
export const WATER_TILE: TileTypeId = 'water';

/**
 * The face-down cover. Not terrain — a hex marked with this still holds a real
 * tile underneath, which is what appears when it is turned over.
 */
export const FOG_TILE: TileTypeId = 'fog';

/** The tile used when a resource pool runs out before the land does. */
export const FALLBACK_LAND_TILE: TileTypeId = 'desert';

export function getTileType(id: TileTypeId): TileType {
    const tile = TILE_TYPES[id];
    if (!tile) {
        console.warn(`Unknown tile type "${id}" — falling back to water`);
        return TILE_TYPES[WATER_TILE];
    }
    return tile;
}

/** Resolved artwork URL for a tile in a given style, or `null` for none. */
export function getTileImage(id: TileTypeId, style: TileStyleId): string | null {
    const source = getTileType(id).images[style];
    return source ? assetUrl(source) : null;
}

export function isWater(id: TileTypeId): boolean {
    return getTileType(id).category === 'water';
}

export function takesNumberToken(id: TileTypeId): boolean {
    return getTileType(id).producesResource;
}

/** Every land tile id, handy when authoring resource pools. */
export const LAND_TILE_IDS: TileTypeId[] = Object.values(TILE_TYPES)
    .filter(tile => tile.category === 'land')
    .map(tile => tile.id);
