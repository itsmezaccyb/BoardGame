import { repeat } from './random';
import { FALLBACK_LAND_TILE, WATER_TILE } from './tiles';
import type { GenerationContext, PortAnchor, PortTypeId, TileTypeId } from './types';

/**
 * Reusable layout strategies.
 *
 * A layout is just `(ctx) => TileTypeId[]` — one tile id per hex, in board
 * reading order. These factories cover the shapes the existing scenarios need;
 * a new scenario can use one of them or supply its own function.
 */

/** Random-number stream offsets, kept apart so strategies never interfere. */
export const RNG_OFFSET = {
    tiles: 0,
    smallIslandTiles: 1000,
    smallIslandWater: 2000,
    tileVariation: 3000,
    resourceSplit: 5000,
    template: 5000,
    fourIslandsTiles: 7000,
    fourIslandsPorts: 8000,
    classicPorts: 0,
    islandPorts: 1000,
} as const;

/**
 * Shuffles one bag of tiles across every hex on the board.
 * Used by the classic (all-land) boards.
 */
export function shuffledLayout(counts: Partial<Record<TileTypeId, number>>) {
    return (ctx: GenerationContext): TileTypeId[] => {
        const pool = repeat(Object.entries(counts) as Array<[TileTypeId, number]>);
        const shuffled = ctx.rng.shuffle(pool, RNG_OFFSET.tiles);
        return Array.from(
            { length: ctx.hexCount },
            (_, i) => shuffled[i] ?? FALLBACK_LAND_TILE
        );
    };
}

/** Describes a board split into a mainland, scattered small islands, and open sea. */
export interface IslandLayoutConfig {
    /** 1-based hex indices forming the mainland. */
    mainland: number[];
    /** 1-based hex indices that are always sea. */
    openSea: number[];
    /**
     * 1-based hex indices available to the small islands. Omit to use every
     * hex that is neither mainland nor open sea.
     */
    smallIslands?: number[];
    /** How many small-island slots stay as sea, chosen at random. */
    smallIslandSeaCount: number;
    /** The bag of tiles dealt to the mainland. */
    mainlandTiles: (ctx: GenerationContext) => TileTypeId[];
    /** The bag of tiles dealt to the small islands. */
    smallIslandTiles: (ctx: GenerationContext) => TileTypeId[];
}

/**
 * Deals two separate tile bags — one for a large mainland, one for the small
 * islands — and leaves the rest as open sea.
 */
export function islandLayout(config: IslandLayoutConfig) {
    return (ctx: GenerationContext): TileTypeId[] => {
        const { rng, hexCount } = ctx;

        const mainland = new Set(config.mainland);
        const openSea = new Set(config.openSea);
        const smallIslands = config.smallIslands
            ? [...config.smallIslands]
            : Array.from({ length: hexCount }, (_, i) => i + 1).filter(
                n => !openSea.has(n) && !mainland.has(n)
            );

        // Sink a few small-island slots so the archipelago differs each game.
        const sunk = new Set(
            rng
                .shuffle(smallIslands, RNG_OFFSET.smallIslandWater)
                .slice(0, config.smallIslandSeaCount)
        );
        const smallIslandSet = new Set(smallIslands);

        const mainlandBag = rng.shuffle(config.mainlandTiles(ctx), RNG_OFFSET.tiles);
        const smallIslandBag = rng.shuffle(
            config.smallIslandTiles(ctx),
            RNG_OFFSET.smallIslandTiles
        );

        let mainlandCursor = 0;
        let smallIslandCursor = 0;

        return Array.from({ length: hexCount }, (_, i) => {
            const hexNumber = i + 1;

            if (openSea.has(hexNumber)) return WATER_TILE;

            if (smallIslandSet.has(hexNumber)) {
                if (sunk.has(hexNumber)) return WATER_TILE;
                return smallIslandBag[smallIslandCursor++] ?? FALLBACK_LAND_TILE;
            }

            if (mainland.has(hexNumber)) {
                return mainlandBag[mainlandCursor++] ?? FALLBACK_LAND_TILE;
            }

            return FALLBACK_LAND_TILE;
        });
    };
}

/** One pre-authored arrangement of islands, with its matching port positions. */
export interface BoardTemplate {
    /** 1-based hex indices that are land. Everything else is sea. */
    land: number[];
    /** Where the ports sit for this arrangement. */
    ports: PortAnchor[];
}

export interface TemplateLayoutConfig {
    templates: BoardTemplate[];
    /** The bag of tiles dealt to the land hexes. */
    tiles: (ctx: GenerationContext) => TileTypeId[];
}

/**
 * Picks one of several hand-authored island arrangements.
 *
 * Both the tiles and the ports must agree on which template was chosen, so the
 * choice is derived from the seed rather than stored — see `pickTemplate`.
 */
export function templateLayout(config: TemplateLayoutConfig) {
    return (ctx: GenerationContext): TileTypeId[] => {
        const template = pickTemplate(config.templates, ctx);
        if (!template) {
            console.warn(`${ctx.variant.id}: no board templates defined`);
            return Array.from({ length: ctx.hexCount }, () => WATER_TILE);
        }

        const land = new Set(template.land);
        const bag = ctx.rng.shuffle(config.tiles(ctx), RNG_OFFSET.fourIslandsTiles);
        let cursor = 0;

        return Array.from({ length: ctx.hexCount }, (_, i) =>
            land.has(i + 1) ? bag[cursor++] ?? WATER_TILE : WATER_TILE
        );
    };
}

/** The template this seed selects. Deterministic, so tiles and ports agree. */
export function pickTemplate<T>(templates: readonly T[], ctx: GenerationContext): T | undefined {
    if (templates.length === 0) return undefined;
    return templates[ctx.rng.index(templates.length, RNG_OFFSET.template)];
}

/** Port anchors taken from the chosen template. */
export function templatePortAnchors(templates: readonly BoardTemplate[]) {
    return (ctx: GenerationContext): PortAnchor[] => pickTemplate(templates, ctx)?.ports ?? [];
}

/** A fixed set of port anchors, for boards whose harbours never move. */
export function fixedPortAnchors(anchors: PortAnchor[]) {
    return (): PortAnchor[] => anchors;
}

/** A fixed port bag, shuffled so the same harbours land in different places. */
export function shuffledPortPool(ports: PortTypeId[], offset: number) {
    return (ctx: GenerationContext): PortTypeId[] => {
        // Matches the historical draw: one value per swap, from a walking seed.
        const next = ctx.rng.stream(offset);
        const out = [...ports];
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(next() * (i + 1));
            [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
    };
}
