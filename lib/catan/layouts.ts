import { deriveCoastSides, indexToRowCol, neighbors, rowColToIndex } from './hex-geometry';
import { repeat } from './random';
import { FALLBACK_LAND_TILE, isWater, WATER_TILE } from './tiles';
import type {
    GenerationContext,
    LayoutResult,
    PortAnchor,
    PortTypeId,
    RowConfig,
    TileTypeId,
} from './types';

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
    islandSpread: 4000,
    resourceSplit: 5000,
    template: 5000,
    hiddenTiles: 6000,
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
    /**
     * How many separate landmasses the small islands must break into. Omit to
     * let the sunk slots fall wherever they land.
     */
    islandCount?: { min: number; max: number };
    /**
     * Tiles that must not share an island — each island gets at most one.
     * Used to keep the gold fields apart, so no single island is worth
     * sailing to twice over.
     */
    onePerIsland?: TileTypeId[];
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

        const mainlandBag = rng.shuffle(config.mainlandTiles(ctx), RNG_OFFSET.tiles);
        const smallIslandBag = rng.shuffle(
            config.smallIslandTiles(ctx),
            RNG_OFFSET.smallIslandTiles
        );

        // Sink a few small-island slots so the archipelago differs each game,
        // then deal that bag island by island rather than in board order.
        const sunk = sinkSmallIslands(smallIslands, config, smallIslandBag, ctx);
        const islands = connectedGroups(
            smallIslands.filter(hexNumber => !sunk.has(hexNumber)),
            ctx.rows
        );
        const smallIslandTiles = dealSmallIslands(
            islands,
            smallIslandBag,
            config.onePerIsland ?? [],
            ctx
        );

        const smallIslandSet = new Set(smallIslands);
        let mainlandCursor = 0;

        return Array.from({ length: hexCount }, (_, i) => {
            const hexNumber = i + 1;

            if (openSea.has(hexNumber)) return WATER_TILE;

            if (smallIslandSet.has(hexNumber)) {
                if (sunk.has(hexNumber)) return WATER_TILE;
                return smallIslandTiles.get(hexNumber) ?? FALLBACK_LAND_TILE;
            }

            if (mainland.has(hexNumber)) {
                return mainlandBag[mainlandCursor++] ?? FALLBACK_LAND_TILE;
            }

            return FALLBACK_LAND_TILE;
        });
    };
}

/** How many draws to try before settling for the closest near miss. */
const ISLAND_SHAPE_ATTEMPTS = 128;

/**
 * Chooses which small-island slots stay as sea.
 *
 * With no `islandCount` this is a plain random draw. With one, draws are
 * retried until the surviving land falls into the wanted number of separate
 * islands — and never fewer than there are tiles to keep apart, since one
 * island cannot hold two golds.
 */
function sinkSmallIslands(
    smallIslands: number[],
    config: IslandLayoutConfig,
    bag: readonly TileTypeId[],
    ctx: GenerationContext
): Set<number> {
    const draw = (attempt: number) =>
        new Set(
            ctx.rng
                .shuffle(smallIslands, RNG_OFFSET.smallIslandWater + attempt)
                .slice(0, config.smallIslandSeaCount)
        );

    if (!config.islandCount) return draw(0);

    const spread = new Set(config.onePerIsland ?? []);
    const min = Math.max(config.islandCount.min, bag.filter(tile => spread.has(tile)).length);
    const max = Math.max(config.islandCount.max, min);

    let best = new Set<number>();
    let bestMiss = Infinity;

    for (let attempt = 0; attempt < ISLAND_SHAPE_ATTEMPTS; attempt++) {
        const sunk = draw(attempt);
        const count = connectedGroups(
            smallIslands.filter(hexNumber => !sunk.has(hexNumber)),
            ctx.rows
        ).length;

        const miss = Math.max(min - count, count - max, 0);
        if (miss === 0) return sunk;
        if (miss < bestMiss) {
            bestMiss = miss;
            best = sunk;
        }
    }

    console.warn(
        `${ctx.variant.id}: could not shape the small islands into ${min}-${max} landmasses`
    );
    return best;
}

/**
 * Deals the small-island bag over the islands, placing the `onePerIsland`
 * tiles first so each lands on an island of its own.
 */
function dealSmallIslands(
    islands: readonly number[][],
    bag: readonly TileTypeId[],
    onePerIsland: readonly TileTypeId[],
    ctx: GenerationContext
): Map<number, TileTypeId> {
    const placed = new Map<number, TileTypeId>();
    const spread = new Set(onePerIsland);
    const spaced = bag.filter(tile => spread.has(tile));
    const rest = bag.filter(tile => !spread.has(tile));

    // Which islands get one, and where on the island it sits, both vary.
    const order = ctx.rng.shuffle(islands.map((_, index) => index), RNG_OFFSET.islandSpread);
    const overflow: TileTypeId[] = [];

    spaced.forEach((tile, index) => {
        const island = order.length > 0 ? islands[order[index % order.length]] : undefined;
        const free = island?.filter(hexNumber => !placed.has(hexNumber)) ?? [];
        if (free.length === 0) {
            overflow.push(tile);
            return;
        }
        placed.set(ctx.rng.pick(free, RNG_OFFSET.islandSpread + 1 + index), tile);
    });

    // The bag was shuffled on the way in, so filling in board order is enough.
    const fill = [...overflow, ...rest];
    islands
        .flat()
        .filter(hexNumber => !placed.has(hexNumber))
        .sort((a, b) => a - b)
        .forEach((hexNumber, index) => {
            const tile = fill[index];
            if (tile) placed.set(hexNumber, tile);
        });

    return placed;
}

/** Splits hexes into landmasses — one entry per group of touching hexes. */
function connectedGroups(members: readonly number[], rows: readonly RowConfig[]): number[][] {
    const unvisited = new Set(members);
    const groups: number[][] = [];

    members.forEach(start => {
        if (!unvisited.delete(start)) return;

        const group: number[] = [];
        const queue = [start];

        while (queue.length > 0) {
            const hexNumber = queue.pop() as number;
            group.push(hexNumber);

            const coords = indexToRowCol(rows, hexNumber - 1);
            if (!coords) continue;

            neighbors(rows, coords.row, coords.col).forEach(({ row, col }) => {
                const neighbor = rowColToIndex(rows, row, col) + 1;
                if (unvisited.delete(neighbor)) queue.push(neighbor);
            });
        }

        groups.push(group);
    });

    return groups;
}

/**
 * Characters used when drawing a board as text.
 *
 * `~` sea, `?` fog (face-down), `.` a hex dealt at random from the pool, and a
 * letter for any tile you want pinned to an exact spot.
 */
export const MAP_LEGEND: Record<string, TileTypeId | 'random' | 'hidden'> = {
    '~': 'water',
    '?': 'hidden',
    '.': 'random',
    F: 'forest',
    P: 'pasture',
    W: 'field',
    M: 'mountain',
    H: 'hill',
    G: 'gold',
    D: 'desert',
};

export interface MapLayoutConfig {
    /**
     * One string per row, one character per hex — see `MAP_LEGEND`. Spaces are
     * ignored, so rows can be indented to show the board's shape.
     */
    map: string[];
    /** The bag dealt to every `.` on the map, shuffled each game. */
    pool?: Partial<Record<TileTypeId, number>>;
    /**
     * The bag dealt to every `?` on the map — real tiles, placed face-down.
     *
     * They are laid out and numbered like any other hex; the board just does
     * not show them until they are turned over.
     */
    hidden?: Partial<Record<TileTypeId, number>>;
    /** Extra or overridden characters, merged over `MAP_LEGEND`. */
    legend?: Record<string, TileTypeId | 'random' | 'hidden'>;
}

/**
 * Builds a board from a text map.
 *
 * Fixed geography — coastlines, channels, the desert wall — is drawn directly,
 * while `.` marks a hex whose tile is dealt from the pool, so a scenario keeps
 * its shape while its resources still vary game to game.
 *
 * This is the easiest way to add a scenario: draw it, list the pool, done.
 */
export function mapLayout(config: MapLayoutConfig) {
    const legend = { ...MAP_LEGEND, ...config.legend };

    return (ctx: GenerationContext): LayoutResult => {
        const cells: Array<TileTypeId | 'random' | 'hidden'> = [];

        ctx.rows.forEach((row, rowIndex) => {
            const line = (config.map[rowIndex] ?? '').replace(/\s+/g, '');
            if (line.length !== row.count) {
                console.warn(
                    `${ctx.variant.id}: map row ${rowIndex} has ${line.length} hexes, board has ${row.count}`
                );
            }
            for (let col = 0; col < row.count; col++) {
                const symbol = line[col];
                const tile = symbol === undefined ? 'water' : legend[symbol];
                if (tile === undefined) {
                    console.warn(`${ctx.variant.id}: unknown map symbol "${symbol}"`);
                }
                cells.push(tile ?? 'water');
            }
        });

        const bag = ctx.rng.shuffle(
            repeat(Object.entries(config.pool ?? {}) as Array<[TileTypeId, number]>),
            RNG_OFFSET.tiles
        );
        const hiddenBag = ctx.rng.shuffle(
            repeat(Object.entries(config.hidden ?? {}) as Array<[TileTypeId, number]>),
            RNG_OFFSET.hiddenTiles
        );

        let cursor = 0;
        let hiddenCursor = 0;
        const fogged: number[] = [];

        const tiles = cells.map((cell, index) => {
            if (cell === 'random') return bag[cursor++] ?? FALLBACK_LAND_TILE;
            if (cell === 'hidden') {
                fogged.push(index + 1);
                return hiddenBag[hiddenCursor++] ?? FALLBACK_LAND_TILE;
            }
            return cell;
        });

        return { tiles, fogged };
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

/**
 * Spreads `count` harbours evenly around the longest coastline.
 *
 * Because this reads the coast of the board that was actually generated, a
 * scenario's map can be redrawn without anyone having to re-pick harbour
 * positions by hand — they follow the new shape. Ports go on the main landmass
 * rather than one per outlying rock.
 */
export function coastPortAnchors(count: number) {
    return (ctx: GenerationContext): PortAnchor[] => {
        const loops = deriveCoastSides(
            ctx.hexes,
            ctx.rows,
            ctx.metrics,
            hex => !isWater(hex.tileType)
        );
        if (loops.length === 0 || count <= 0) return [];

        const coast = loops.reduce((longest, loop) =>
            loop.length > longest.length ? loop : longest
        );
        const wanted = Math.min(count, coast.length);
        const step = coast.length / wanted;

        return Array.from({ length: wanted }, (_, i) => {
            const { hex, side } = coast[Math.floor(i * step) % coast.length];
            return { hex, side };
        });
    };
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
