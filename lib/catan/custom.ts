import { deriveCoastSides, totalHexCount } from './hex-geometry';
import { RNG_OFFSET } from './layouts';
import { repeat } from './random';
import { isWater, takesNumberToken, WATER_TILE } from './tiles';
import type {
    BoardVariant,
    GenerationContext,
    Hex,
    HexMetrics,
    HexSide,
    PortAnchor,
    PortTypeId,
    RowConfig,
    TileTypeId,
} from './types';

/**
 * Custom ("build your own") boards.
 *
 * Everything here turns a plain, serialisable `CustomBoardConfig` into a
 * regular `BoardVariant`, so a custom board runs through exactly the same
 * generator, renderer and coastline code as the built-in ones.
 */

// --------------------------------------------------------------------------
// Board sizes
// --------------------------------------------------------------------------

/**
 * How tall a board may get.
 *
 * The board is laid out at a fixed physical scale rather than being shrunk to
 * fit, so past seven rows it runs off the bottom of the screen. Bigger sizes
 * therefore keep seven rows and widen instead.
 */
export const MAX_BOARD_ROWS = 7;

/** The radius at which a regular hexagon reaches `MAX_BOARD_ROWS`. */
const TALLEST_RADIUS = (MAX_BOARD_ROWS - 1) / 2;

/** How wide the top and bottom rows may grow once widening takes over. */
const WIDEST_END_ROW = 8;

/** Row counts for a regular hexagon: `radius + 1` at the ends, `2r + 1` across. */
function hexagonRows(radius: number): number[] {
    return Array.from({ length: radius * 2 + 1 }, (_, row) =>
        radius + 1 + Math.min(row, radius * 2 - row)
    );
}

const SIZE_LABELS = ['Tiny', 'Small', 'Medium', 'Large', 'Extra large', 'Huge', 'Max'];

/**
 * The shapes behind the size slider.
 *
 * Small boards are regular hexagons. Once seven rows is reached the outline
 * stops growing taller and stretches sideways instead, one hex per step, until
 * the top and bottom rows are `WIDEST_END_ROW` across.
 *
 * Any other outline is made by pinning hexes to water — carving the shape you
 * want out of a larger board — so there is no need to edit rows by hand.
 */
const BOARD_SHAPES: number[][] = [
    ...Array.from({ length: TALLEST_RADIUS }, (_, i) => hexagonRows(i + 1)),
    ...Array.from({ length: WIDEST_END_ROW - (TALLEST_RADIUS + 1) }, (_, i) =>
        hexagonRows(TALLEST_RADIUS).map(count => count + i + 1)
    ),
];

export const BOARD_SIZES = BOARD_SHAPES.map((counts, index) => {
    const widest = Math.max(...counts);
    return {
        label: SIZE_LABELS[index] ?? `Size ${index + 1}`,
        hexCount: counts.reduce((sum, n) => sum + n, 0),
        rows: counts.map(count => ({ count, offset: (widest - count) / 2 })) as RowConfig[],
        widthHexes: widest,
        heightRows: counts.length - 1,
    };
});

export const DEFAULT_SIZE_INDEX = 1; // the classic 19-hex board

export function boardSize(index: number) {
    return BOARD_SIZES[Math.min(BOARD_SIZES.length - 1, Math.max(0, index))];
}

// --------------------------------------------------------------------------
// Config
// --------------------------------------------------------------------------

export interface CustomPort {
    hex: number;
    side: HexSide;
    portType: PortTypeId;
}

export interface CustomBoardConfig {
    /** Index into `BOARD_SIZES`. */
    sizeIndex: number;
    /** How many of each tile type to shuffle into the unlocked hexes. */
    tileCounts: Record<TileTypeId, number>;
    /**
     * The mix resizing scales from, set whenever the counts are edited by hand.
     *
     * Resizing from the current counts would compound its own rounding — a trip
     * down to the 7-hex board and back leaves the proportions visibly skewed —
     * so every resize derives from this fixed reference instead.
     */
    tileRatio?: Record<TileTypeId, number>;
    /** Hexes pinned to a tile type, keyed by 1-based hex index. */
    locked: Record<number, TileTypeId>;
    /** Harbours, auto-placed to begin with and then editable by hand. */
    ports: CustomPort[];
}

export const DEFAULT_CUSTOM_CONFIG: CustomBoardConfig = {
    sizeIndex: DEFAULT_SIZE_INDEX,
    // The classic 19-hex spread.
    tileCounts: { forest: 4, pasture: 4, field: 4, mountain: 3, hill: 3, desert: 1 },
    locked: {},
    ports: [],
};

/** Fills in anything missing, so older saved boards keep working. */
export function normalizeConfig(config: Partial<CustomBoardConfig> | null): CustomBoardConfig {
    const sizeIndex = config?.sizeIndex ?? DEFAULT_CUSTOM_CONFIG.sizeIndex;
    return pruneToBoard({
        sizeIndex,
        tileCounts: { ...config?.tileCounts },
        tileRatio: config?.tileRatio ? { ...config.tileRatio } : undefined,
        locked: { ...config?.locked },
        ports: Array.isArray(config?.ports) ? config!.ports : [],
    });
}

/**
 * Drops pins and harbours that fall outside the board.
 *
 * Shrinking the board leaves references to hexes that no longer exist; without
 * this they linger invisibly and are counted against the free-hex total.
 */
export function pruneToBoard(config: CustomBoardConfig): CustomBoardConfig {
    const { hexCount } = boardSize(config.sizeIndex);

    const locked: Record<number, TileTypeId> = {};
    Object.entries(config.locked).forEach(([hex, tile]) => {
        if (Number(hex) >= 1 && Number(hex) <= hexCount) locked[Number(hex)] = tile;
    });

    return {
        ...config,
        locked,
        ports: config.ports.filter(port => port.hex >= 1 && port.hex <= hexCount),
    };
}

/** Hexes available to the shuffled pool — everything not pinned by hand. */
export function unlockedHexCount(config: CustomBoardConfig): number {
    return boardSize(config.sizeIndex).hexCount - Object.keys(config.locked).length;
}

export function placedTileCount(config: CustomBoardConfig): number {
    return Object.values(config.tileCounts).reduce((sum, n) => sum + (n || 0), 0);
}

// --------------------------------------------------------------------------
// Number tokens
// --------------------------------------------------------------------------

const NUMBER_VALUES = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];
/** Classic Catan proportions: the extremes appear half as often. */
const NUMBER_WEIGHTS = [1, 2, 2, 2, 2, 2, 2, 2, 2, 1];

/**
 * Spreads `count` number tokens across 2-12 in classic proportions.
 *
 * Uses largest-remainder allocation so the totals always add up exactly,
 * whatever the board size.
 */
export function buildNumberDistribution(count: number): Record<number, number> {
    const total = NUMBER_WEIGHTS.reduce((sum, w) => sum + w, 0);
    const exact = NUMBER_WEIGHTS.map(weight => (count * weight) / total);
    const allocation = exact.map(Math.floor);

    let remaining = count - allocation.reduce((sum, n) => sum + n, 0);
    // Hand out the leftovers to whichever numbers were rounded down hardest,
    // preferring the middle of the range so 6s and 8s stay placeable.
    const order = exact
        .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
        .sort((a, b) => b.remainder - a.remainder || Math.abs(4.5 - a.index) - Math.abs(4.5 - b.index));

    for (let i = 0; remaining > 0; i = (i + 1) % order.length) {
        allocation[order[i].index] += 1;
        remaining -= 1;
    }

    const distribution: Record<number, number> = {};
    NUMBER_VALUES.forEach((value, index) => {
        if (allocation[index] > 0) distribution[value] = allocation[index];
    });
    return distribution;
}

// --------------------------------------------------------------------------
// Ports
// --------------------------------------------------------------------------

/** The bag harbours are dealt from when auto-placing. */
const AUTO_PORT_CYCLE: PortTypeId[] = [
    'brick_2-1', 'generic_3-1', 'sheep_2-1', 'generic_3-1', 'rock_2-1',
    'generic_3-1', 'wood_2-1', 'generic_3-1', 'wheat_2-1',
];

/** Every coast side of the land on a board, in clockwise order per landmass. */
export function coastSidesFor(
    hexes: readonly Hex[],
    rows: readonly RowConfig[],
    metrics: HexMetrics
) {
    return deriveCoastSides(hexes, rows, metrics, hex => !isWater(hex.tileType));
}

/**
 * Spreads `count` harbours evenly around the coast.
 *
 * Ports go on the longest coastline — the main landmass — so a board with a
 * few stray islands still gets a sensible ring rather than one port per rock.
 */
export function autoPlacePorts(
    hexes: readonly Hex[],
    rows: readonly RowConfig[],
    metrics: HexMetrics,
    count: number
): CustomPort[] {
    const loops = coastSidesFor(hexes, rows, metrics);
    if (loops.length === 0 || count <= 0) return [];

    const coast = loops.reduce((longest, loop) => (loop.length > longest.length ? loop : longest));
    const wanted = Math.min(count, coast.length);
    const step = coast.length / wanted;

    return Array.from({ length: wanted }, (_, i) => {
        const { hex, side } = coast[Math.floor(i * step) % coast.length];
        return { hex, side, portType: AUTO_PORT_CYCLE[i % AUTO_PORT_CYCLE.length] };
    });
}

/** A sensible number of harbours for a board with this much coast. */
export function suggestedPortCount(coastLength: number): number {
    return Math.max(2, Math.round(coastLength / 3.5));
}

// --------------------------------------------------------------------------
// Variant
// --------------------------------------------------------------------------

export const CUSTOM_EXPANSION = 'custom';
export const CUSTOM_VARIANT_ID = 'custom:board';

/**
 * Turns a config into a playable variant.
 *
 * Locked hexes are placed first and never touched again; the counted tiles are
 * shuffled into whatever is left, and any remainder stays sea.
 */
export function buildCustomVariant(config: CustomBoardConfig): BoardVariant {
    const size = boardSize(config.sizeIndex);
    const hexCount = totalHexCount(size.rows);

    const layout = (ctx: GenerationContext): TileTypeId[] => {
        const tiles: TileTypeId[] = Array.from({ length: hexCount }, () => WATER_TILE);

        const open: number[] = [];
        for (let i = 0; i < hexCount; i++) {
            const locked = config.locked[i + 1];
            if (locked) tiles[i] = locked;
            else open.push(i);
        }

        const pool = ctx.rng.shuffle(
            repeat(Object.entries(config.tileCounts) as Array<[TileTypeId, number]>),
            RNG_OFFSET.tiles
        );
        open.forEach((hexIndex, i) => {
            if (i < pool.length) tiles[hexIndex] = pool[i];
        });

        return tiles;
    };

    // Numbers are sized to however many producing tiles the board ends up with.
    const producing =
        Object.entries(config.tileCounts)
            .filter(([id]) => takesNumberToken(id))
            .reduce((sum, [, n]) => sum + (n || 0), 0) +
        Object.values(config.locked).filter(takesNumberToken).length;

    return {
        id: CUSTOM_VARIANT_ID,
        expansion: CUSTOM_EXPANSION,
        playerCount: 'custom',
        label: 'Custom Board',
        rows: size.rows,
        board: { widthHexes: size.widthHexes, heightRows: size.heightRows },
        numberDistribution: buildNumberDistribution(producing),
        layout,
        coastlines: [{ id: 'board', weight: 'board', region: 'land' }],
        // Omitted entirely rather than left empty, so a board with no harbours
        // is genuinely portless rather than declaring ports it cannot place.
        ports: config.ports.length
            ? {
                pool: () => config.ports.map(port => port.portType),
                anchors: () => config.ports.map(({ hex, side }): PortAnchor => ({ hex, side })),
            }
            : undefined,
        display: { tileRender: 'cover', barbarianTrack: { orientation: 'left', topOffset: '50%' } },
    };
}

/** A board built from the defaults, used to register the mode in the UI. */
export const CUSTOM_VARIANT_TEMPLATE = buildCustomVariant(DEFAULT_CUSTOM_CONFIG);

/**
 * Rescales a tile mix to fill `target` hexes, keeping the proportions.
 *
 * Uses largest-remainder allocation so the counts always add up to exactly the
 * target rather than drifting a tile or two out under rounding.
 */
export function scaleTileCounts(
    counts: Record<TileTypeId, number>,
    target: number
): Record<TileTypeId, number> {
    // An empty mix has no proportions to preserve, so fall back to the classic one.
    const source = Object.values(counts).some(n => n > 0) ? counts : DEFAULT_CUSTOM_CONFIG.tileCounts;
    const entries = Object.entries(source).filter(([, n]) => n > 0) as Array<[TileTypeId, number]>;
    const total = entries.reduce((sum, [, n]) => sum + n, 0);

    if (target <= 0 || total === 0 || entries.length === 0) return {};

    const scale = target / total;
    const exact = entries.map(([id, n]) => ({ id, value: n * scale }));

    const scaled: Record<TileTypeId, number> = {};
    let assigned = 0;
    exact.forEach(({ id, value }) => {
        scaled[id] = Math.floor(value);
        assigned += scaled[id];
    });

    const byRemainder = [...exact].sort(
        (a, b) => (b.value % 1) - (a.value % 1) || b.value - a.value
    );
    for (let i = 0; assigned < target; i = (i + 1) % byRemainder.length) {
        scaled[byRemainder[i].id] += 1;
        assigned += 1;
    }

    // Scaling down hard can round a tile type away completely, and once it is
    // gone it never comes back when the board grows again. As long as the
    // board has room for one of everything, keep every type present by taking
    // a tile from whichever type has the most.
    if (entries.length <= target) {
        const missing = () => exact.find(({ id }) => scaled[id] === 0);
        for (let entry = missing(); entry; entry = missing()) {
            const donor = exact
                .map(({ id }) => id)
                .reduce((most, id) => (scaled[id] > scaled[most] ? id : most));
            if (scaled[donor] <= 1) break;
            scaled[donor] -= 1;
            scaled[entry.id] += 1;
        }
    }

    Object.keys(scaled).forEach(id => {
        if (scaled[id] === 0) delete scaled[id];
    });

    return scaled;
}

/**
 * Switches to a different board size, bringing the tile mix with it.
 *
 * The proportions the player chose are kept; only the totals move, so a board
 * that was mostly forest stays mostly forest at any size. Pins and harbours
 * that fall off a smaller board are dropped.
 */
export function resizeBoard(config: CustomBoardConfig, sizeIndex: number): CustomBoardConfig {
    const pruned = pruneToBoard({ ...config, sizeIndex });
    const free = boardSize(sizeIndex).hexCount - Object.keys(pruned.locked).length;
    // Pinned down on the first resize, so repeated slides all derive from the
    // same reference rather than from each other.
    const ratio = config.tileRatio ?? config.tileCounts;

    return { ...pruned, tileRatio: ratio, tileCounts: scaleTileCounts(ratio, free) };
}

/** Refills the board with the current mix — used after pinning changes the free count. */
export function refitTiles(config: CustomBoardConfig, free: number): CustomBoardConfig {
    return {
        ...config,
        tileCounts: scaleTileCounts(config.tileRatio ?? config.tileCounts, free),
    };
}

/** Records a hand-edited mix as the new reference for future resizing. */
export function setTileCount(
    config: CustomBoardConfig,
    tile: TileTypeId,
    value: number
): CustomBoardConfig {
    const tileCounts = { ...config.tileCounts, [tile]: Math.max(0, value) };
    if (tileCounts[tile] === 0) delete tileCounts[tile];
    return { ...config, tileCounts, tileRatio: tileCounts };
}

