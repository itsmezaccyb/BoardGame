import type { ResourceType } from '@/lib/building-costs';
import type { PortTypeId, TileStyleId } from './types';

/**
 * Port registry.
 *
 * ---------------------------------------------------------------------------
 * TO ADD A NEW PORT TYPE
 * ---------------------------------------------------------------------------
 * 1. Add an entry to `PORT_TYPES` below.
 * 2. Give it `art` for styles that use a bespoke boat image, and/or a `logo`
 *    for styles that stamp a resource icon onto a shared boat (see
 *    `styles.ts` — a style picks one of the two modes).
 * 3. Reference its id from a variant's port pool.
 */

export interface PortType {
    id: PortTypeId;
    label: string;
    /** Trade ratio, e.g. 2 for a 2:1 port. */
    ratio: number;
    /** The resource traded, or omitted for a generic port. */
    resource?: ResourceType;
    /** Per-style bespoke boat artwork ('art' mode). */
    art: Partial<Record<TileStyleId, string>>;
    /** Per-style icon stamped onto the shared boat ('overlay' mode). */
    logo: Partial<Record<TileStyleId, string>>;
    /** Size of the overlay icon as a fraction of the boat, default 0.22. */
    logoScale?: number;
}

const DEFAULT_LOGO_SCALE = 0.22;

function resourcePort(
    id: PortTypeId,
    label: string,
    resource: ResourceType,
    art: string,
    logo: string
): PortType {
    return { id, label, ratio: 2, resource, art: { classic: art }, logo: { simple: logo } };
}

export const PORT_TYPES: Record<PortTypeId, PortType> = {
    'brick_2-1': resourcePort(
        'brick_2-1', 'Brick 2:1', 'brick',
        '/images/catan_boat_brick_2-1.png',
        '/images/catan_brick_logo_style.png'
    ),
    'sheep_2-1': resourcePort(
        'sheep_2-1', 'Sheep 2:1', 'sheep',
        '/images/catan_boat_sheep_2-1.png',
        '/images/catan_sheep_logo_stle.png'
    ),
    'rock_2-1': resourcePort(
        'rock_2-1', 'Ore 2:1', 'ore',
        '/images/catan_boat_rock_2-1.png',
        '/images/catan_rock_logo_style.png'
    ),
    'wood_2-1': resourcePort(
        'wood_2-1', 'Wood 2:1', 'wood',
        '/images/catan_boat_wood_2-1.png',
        '/images/catan_wood_logo_style.png'
    ),
    'wheat_2-1': resourcePort(
        'wheat_2-1', 'Wheat 2:1', 'wheat',
        '/images/catan_boat_wheat_2-1.png',
        '/images/catan_wheat_logo_style.png'
    ),
    'generic_3-1': {
        id: 'generic_3-1',
        label: 'Any 3:1',
        ratio: 3,
        art: { classic: '/images/catan_boat_generic_3-1.png' },
        logo: { simple: '/images/catan_generic_logo.png' },
        logoScale: 0.11,
    },
};

export function getPortType(id: PortTypeId): PortType | null {
    const port = PORT_TYPES[id];
    if (!port) {
        console.warn(`Unknown port type "${id}"`);
        return null;
    }
    return port;
}

// Boat artwork is served from `public/` rather than through
// `lib/image-mapping`, matching how these assets have always been loaded.

export function getPortArt(id: PortTypeId, style: TileStyleId): string | null {
    return getPortType(id)?.art[style] ?? null;
}

export function getPortLogo(id: PortTypeId, style: TileStyleId): string | null {
    return getPortType(id)?.logo[style] ?? null;
}

export function getPortLogoScale(id: PortTypeId): number {
    return getPortType(id)?.logoScale ?? DEFAULT_LOGO_SCALE;
}
