/**
 * Core Catan types.
 *
 * Everything that varies between game modes is expressed as data here, so that
 * adding a new tile, port, visual style or scenario means adding a registry
 * entry rather than editing rendering or generation code.
 */

/** Id of a tile type registered in `tiles.ts` (e.g. 'forest', 'water', 'gold'). */
export type TileTypeId = string;

/** Id of a port type registered in `ports.ts` (e.g. 'wood_2-1', 'generic_3-1'). */
export type PortTypeId = string;

/** Id of a visual style registered in `styles.ts` (e.g. 'classic', 'simple'). */
export type TileStyleId = string;

/**
 * The six sides of a hex, named by compass direction and listed clockwise.
 *
 * A side's position in this list is also the index of the vertex it starts
 * at, so side `n` runs from vertex `n` to vertex `n + 1`:
 *
 *            nw ___ ne
 *              /   \
 *           w |     | e
 *              \___/
 *            sw     se
 */
export const HEX_SIDES = ['ne', 'e', 'se', 'sw', 'w', 'nw'] as const;

export type HexSide = (typeof HEX_SIDES)[number];

/** Id of an expansion registered in `variants/index.ts` (e.g. 'classic', 'seafarers'). */
export type ExpansionId = string;

/** Id of a scenario within an expansion (e.g. 'heading-for-new-shores'). */
export type ScenarioId = string;

/** Player counts a variant can be built for. Strings allow ranges like '5-6'. */
export type PlayerCount = number | string;

export interface Point {
    x: number;
    y: number;
}

/** One row of the hex grid: how many hexes, and how far it is nudged sideways. */
export interface RowConfig {
    /** Number of hexes in the row. */
    count: number;
    /** Horizontal offset in hex-widths (0.5 = half a hex to the right). */
    offset: number;
}

/** Pixel size of a single hex plus the row-to-row vertical step. */
export interface HexMetrics {
    width: number;
    height: number;
    verticalSpacing: number;
}

/** A single placed hex on a generated board. */
export interface Hex {
    id: string;
    /** 0-based index in reading order (row 0 left-to-right, then row 1, ...). */
    index: number;
    row: number;
    col: number;
    /** Top-left pixel position of the hex bounding box. */
    x: number;
    y: number;
    tileType: TileTypeId;
    /** Dice number token, when this tile takes one. */
    number?: number;
    /**
     * Face-down: a real tile sits here, covered until someone turns it over.
     *
     * Fog is a cover rather than a kind of tile, so the board underneath is
     * generated in full — terrain and number alike — and revealing simply stops
     * hiding it.
     */
    fogged?: boolean;
}

/** A port boat rendered at a board edge. */
export interface PortPlacement {
    portType: PortTypeId;
    x: number;
    y: number;
    /** Rotation in degrees so the boat sits flush against the edge. */
    angle: number;
}

/**
 * How thick/soft an outline is drawn. The concrete stroke layers for each
 * weight live in the tile-style registry, so a new style can restyle every
 * board outline at once.
 */
export type OutlineWeight = 'board' | 'island';

/**
 * What a layout hands back.
 *
 * Usually just the tile of every hex in reading order. A board with face-down
 * hexes returns the covered ones too — they still get real tiles, so the shape
 * of the board is decided once and revealing changes nothing but what is shown.
 */
export type LayoutResult =
    | TileTypeId[]
    | {
        tiles: TileTypeId[];
        /** 1-based hex indices that start face-down. */
        fogged?: number[];
    };

/**
 * Which hexes a coastline wraps.
 *
 * `'land'` follows every non-water hex, which is usually what you want.
 * An explicit list of 1-based hex indices picks out one landmass — a mainland,
 * say, when the same board also has small islands you do not want outlined.
 * A function computes the list per game, for boards whose land varies.
 */
export type CoastlineRegion = 'land' | number[] | ((ctx: GenerationContext) => number[]);

/**
 * A coastline to draw. The shape is derived from the hexes themselves, so
 * there is nothing to trace by hand.
 */
export interface CoastlineSpec {
    id: string;
    weight: OutlineWeight;
    region: CoastlineRegion;
}

/** A coastline resolved to pixels — one closed loop per landmass. */
export interface RenderedOutline {
    id: string;
    weight: OutlineWeight;
    loops: Point[][];
}

/**
 * Where a port boat moors: against one side of one hex.
 *
 * Sides are named by compass direction — `'ne' | 'e' | 'se' | 'sw' | 'w' | 'nw'`
 * — so an anchor reads as "the north-west side of hex 12" and stays correct no
 * matter how the coastline around it changes.
 */
export interface PortAnchor {
    /** 1-based hex index in board reading order. */
    hex: number;
    side: HexSide;
}

/** Everything a layout/port function is handed while a board is generated. */
export interface GenerationContext {
    variant: BoardVariant;
    rows: RowConfig[];
    /** Total number of hexes on the board. */
    hexCount: number;
    metrics: HexMetrics;
    rng: SeededRng;
    /**
     * The board's hexes.
     *
     * Positions are final from the start; tile types are filled in by the
     * layout, so this is only meaningful to code that runs afterwards — port
     * placement, which needs to know where the coast ended up.
     */
    hexes: Hex[];
}

/** Deterministic random source; see `random.ts`. */
export interface SeededRng {
    seed: number;
    /** Raw value in [0, 1) for a given stream offset and index. */
    value(offset: number, index: number): number;
    /** Fisher-Yates shuffle driven by the `offset` stream. */
    shuffle<T>(items: readonly T[], offset: number): T[];
    /** Uniform pick from `items` using the `offset` stream. */
    pick<T>(items: readonly T[], offset: number): T;
    /** Index in `[0, count)` using the `offset` stream. */
    index(count: number, offset: number): number;
    /** A self-advancing generator, for sequences of draws. */
    stream(offset: number): () => number;
}

/** How the tile artwork is fitted inside the hex. */
export type TileRenderMode = 'cover' | 'rotated';

/** Purely presentational per-variant tweaks. */
export interface VariantDisplay {
    /** Rotate the whole board, e.g. 90 for the tall 3-player layouts. */
    rotateDeg?: number;
    /** Extra top margin, expressed in inches so it scales with board size. */
    marginTopInches?: number;
    /** Shift every hex up/down by this many row-steps (-0.5 nudges up half a row). */
    verticalOffsetRows?: number;
    /** How tile artwork fills the hex. */
    tileRender?: TileRenderMode;
    /** Counter-rotation applied to number tokens so they stay upright. */
    numberTokenRotationDeg?: number;
    /** Where the Cities & Knights barbarian track is drawn. */
    barbarianTrack?: {
        orientation: 'left' | 'below';
        /** CSS `top` value used by the left-hand orientation. */
        topOffset?: string;
    };
}

/** Board bounding box, expressed in hexes/rows so it scales with `HexMetrics`. */
export interface BoardSize {
    /** Width of the widest row, in hex widths. */
    widthHexes: number;
    /** Height in vertical row-steps (plus one full hex height). */
    heightRows: number;
}

/**
 * A complete, self-contained description of one playable board.
 *
 * To add a game mode, export one of these from a file in `variants/` and
 * register it — generation, rendering and the settings UI all read from here.
 */
export interface BoardVariant {
    /** Unique id, conventionally `expansion:scenario:playerCount`. */
    id: string;
    expansion: ExpansionId;
    scenario?: ScenarioId;
    playerCount: PlayerCount;
    label: string;
    rows: RowConfig[];
    board: BoardSize;
    /** How many of each dice number to hand out, e.g. `{ 2: 1, 3: 2, ... }`. */
    numberDistribution: Record<number, number>;
    /** Decides the tile type of every hex, in board reading order. */
    layout: (ctx: GenerationContext) => LayoutResult;
    /** Coastlines to draw around the finished board. */
    coastlines?: CoastlineSpec[];
    ports?: {
        /** The bag of port types to deal out, already in deal order. */
        pool: (ctx: GenerationContext) => PortTypeId[];
        /** Which hex sides those ports moor against. */
        anchors: (ctx: GenerationContext) => PortAnchor[];
    };
    display?: VariantDisplay;
}

/** The finished product handed to the renderer. */
export interface GeneratedBoard {
    variant: BoardVariant;
    seed: number;
    metrics: HexMetrics;
    rows: RowConfig[];
    hexes: Hex[];
    outlines: RenderedOutline[];
    ports: PortPlacement[];
    width: number;
    height: number;
}
