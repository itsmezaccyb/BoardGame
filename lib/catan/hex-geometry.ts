import { inchesToPixels } from '@/lib/dimensions';
import { HEX_SIDES } from './types';
import type { Hex, HexMetrics, HexSide, Point, RowConfig } from './types';

export { HEX_SIDES };
export type { HexSide };

/**
 * Pure hex-grid geometry. Nothing here knows about Catan rules — it only turns
 * row/column coordinates into pixels and answers adjacency questions.
 *
 * Vertex indices used throughout:
 *   0 top, 1 top-right, 2 bottom-right, 3 bottom, 4 bottom-left, 5 top-left
 */

/** Physical tile size of the printed board, in inches. */
export const HEX_INCHES = { width: 3.12, height: 3.6 } as const;

/** Global scale applied to the printed size. */
export const HEX_SCALE = 0.9;

export function createHexMetrics(
    widthInches: number = HEX_INCHES.width,
    heightInches: number = HEX_INCHES.height,
    scale: number = HEX_SCALE
): HexMetrics {
    const width = inchesToPixels(widthInches * scale);
    const height = inchesToPixels(heightInches * scale);
    return { width, height, verticalSpacing: height * 0.75 };
}

export function totalHexCount(rows: readonly RowConfig[]): number {
    return rows.reduce((sum, row) => sum + row.count, 0);
}

export function rowColToIndex(rows: readonly RowConfig[], row: number, col: number): number {
    let index = 0;
    for (let r = 0; r < row; r++) index += rows[r]?.count ?? 0;
    return index + col;
}

export function indexToRowCol(
    rows: readonly RowConfig[],
    index: number
): { row: number; col: number } | null {
    let cursor = 0;
    for (let row = 0; row < rows.length; row++) {
        const count = rows[row]?.count ?? 0;
        if (cursor + count > index) return { row, col: index - cursor };
        cursor += count;
    }
    return null;
}

export function sideIndex(side: HexSide): number {
    return HEX_SIDES.indexOf(side);
}

/**
 * The hex across one side, or `null` when that side faces open space.
 *
 * Which column a row touches above and below depends on how the rows are
 * offset: when this row sits further right it lines up with columns c and
 * c + 1, when further left with c - 1 and c.
 */
export function neighborAt(
    rows: readonly RowConfig[],
    rowIndex: number,
    colIndex: number,
    side: HexSide | number
): { row: number; col: number } | null {
    const row = rows[rowIndex];
    if (!row) return null;

    const dir = typeof side === 'number' ? side : sideIndex(side);

    const at = (r: number, c: number) => {
        const target = rows[r];
        if (!target || c < 0 || c >= target.count) return null;
        return { row: r, col: c };
    };

    const across = (otherIndex: number, rightHandSide: boolean) => {
        const other = rows[otherIndex];
        if (!other) return null;
        const shift = row.offset > other.offset ? 0 : -1;
        return at(otherIndex, colIndex + shift + (rightHandSide ? 1 : 0));
    };

    switch (dir) {
        case 0: return across(rowIndex - 1, true);   // ne
        case 1: return at(rowIndex, colIndex + 1);   // e
        case 2: return across(rowIndex + 1, true);   // se
        case 3: return across(rowIndex + 1, false);  // sw
        case 4: return at(rowIndex, colIndex - 1);   // w
        case 5: return across(rowIndex - 1, false);  // nw
        default: return null;
    }
}

/** Every neighbouring row/col pair, in side order. */
export function neighbors(
    rows: readonly RowConfig[],
    rowIndex: number,
    colIndex: number
): Array<{ row: number; col: number }> {
    return HEX_SIDES.map((_, dir) => neighborAt(rows, rowIndex, colIndex, dir)).filter(
        (n): n is { row: number; col: number } => n !== null
    );
}

/** Centre point of a hex given its top-left bounding-box position. */
export function hexCenter(hex: Pick<Hex, 'x' | 'y'>, metrics: HexMetrics): Point {
    return { x: hex.x + metrics.width / 2, y: hex.y + metrics.height / 2 };
}

/** The six corners of a flat-sided hexagon, optionally grown by `expand` px. */
export function hexVertices(centerX: number, centerY: number, metrics: HexMetrics, expand = 0): Point[] {
    const w = metrics.width / 2 + expand;
    const h = metrics.height / 2 + expand;
    return [
        { x: centerX, y: centerY - h },
        { x: centerX + w, y: centerY - h / 2 },
        { x: centerX + w, y: centerY + h / 2 },
        { x: centerX, y: centerY + h },
        { x: centerX - w, y: centerY + h / 2 },
        { x: centerX - w, y: centerY - h / 2 },
    ];
}

/** SVG `points` attribute for a hexagon. */
export function hexagonPoints(centerX: number, centerY: number, metrics: HexMetrics, expand = 0): string {
    return hexVertices(centerX, centerY, metrics, expand)
        .map(({ x, y }) => `${x},${y}`)
        .join(' ');
}

/** CSS `clip-path: polygon(...)` body, in percentages of the hex box. */
export function hexagonClipPath(metrics: HexMetrics): string {
    return hexVertices(metrics.width / 2, metrics.height / 2, metrics)
        .map(({ x, y }) => `${(x / metrics.width) * 100}% ${(y / metrics.height) * 100}%`)
        .join(', ');
}

/** Lays out every hex position for a set of rows. Tile types are filled in later. */
export function buildGrid(
    rows: readonly RowConfig[],
    metrics: HexMetrics,
    verticalOffsetRows = 0
): Hex[] {
    const hexes: Hex[] = [];
    const verticalOffset = verticalOffsetRows * metrics.verticalSpacing;

    rows.forEach((row, rowIndex) => {
        const startX = row.offset * metrics.width;
        for (let colIndex = 0; colIndex < row.count; colIndex++) {
            hexes.push({
                id: `hex-${rowIndex}-${colIndex}`,
                index: hexes.length,
                row: rowIndex,
                col: colIndex,
                x: startX + colIndex * metrics.width,
                y: rowIndex * metrics.verticalSpacing + verticalOffset,
                tileType: 'water',
            });
        }
    });

    return hexes;
}

/** Vertices of the hex at `row`/`col`, or `null` if the coordinates are off-board. */
export function verticesAt(
    hexes: readonly Hex[],
    rows: readonly RowConfig[],
    row: number,
    col: number,
    metrics: HexMetrics
): Point[] | null {
    if (row < 0 || row >= rows.length || col < 0 || col >= (rows[row]?.count ?? 0)) return null;
    const hex = hexes[rowColToIndex(rows, row, col)];
    if (!hex) return null;
    const center = hexCenter(hex, metrics);
    return hexVertices(center.x, center.y, metrics);
}

/** The two endpoints of one side of one hex. */
export function sideEndpoints(
    hex: Pick<Hex, 'x' | 'y'>,
    side: HexSide | number,
    metrics: HexMetrics
): [Point, Point] {
    const dir = typeof side === 'number' ? side : sideIndex(side);
    const center = hexCenter(hex, metrics);
    const vertices = hexVertices(center.x, center.y, metrics);
    return [vertices[dir], vertices[(dir + 1) % 6]];
}

/** Rounds a point to a stable key so shared vertices compare equal. */
function pointKey(point: Point): string {
    return `${Math.round(point.x * 100)},${Math.round(point.y * 100)}`;
}

/**
 * Traces the outline around a set of hexes.
 *
 * Any side that does not have another member of the set across it is a
 * boundary side; chaining those sides end-to-end gives the coastline. Sides
 * run clockwise around their own hex, so the resulting loops come out
 * clockwise too.
 *
 * Returns one closed loop per landmass, so a scattered archipelago produces a
 * separate outline around each island with no extra work.
 */
export function deriveCoastline(
    hexes: readonly Hex[],
    rows: readonly RowConfig[],
    metrics: HexMetrics,
    isInside: (hex: Hex) => boolean
): Point[][] {
    const inside = new Set<number>();
    hexes.forEach(hex => {
        if (isInside(hex)) inside.add(hex.index);
    });

    type Side = { from: Point; to: Point };
    const sides: Side[] = [];
    const startingAt = new Map<string, Side[]>();

    hexes.forEach(hex => {
        if (!inside.has(hex.index)) return;
        HEX_SIDES.forEach((_, dir) => {
            const neighbor = neighborAt(rows, hex.row, hex.col, dir);
            const neighborIndex = neighbor ? rowColToIndex(rows, neighbor.row, neighbor.col) : -1;
            if (neighborIndex >= 0 && inside.has(neighborIndex)) return;

            const [from, to] = sideEndpoints(hex, dir, metrics);
            const side = { from, to };
            sides.push(side);

            const key = pointKey(from);
            const bucket = startingAt.get(key);
            if (bucket) bucket.push(side);
            else startingAt.set(key, [side]);
        });
    });

    const used = new Set<Side>();
    const loops: Point[][] = [];

    sides.forEach(start => {
        if (used.has(start)) return;

        const loop: Point[] = [];
        let current: Side | undefined = start;

        while (current && !used.has(current)) {
            used.add(current);
            loop.push(current.from);
            // Where two landmasses meet at a single vertex more than one side
            // can continue; either choice still closes a valid loop.
            current = startingAt.get(pointKey(current.to))?.find(side => !used.has(side));
        }

        if (loop.length >= 3) loops.push(loop);
    });

    return loops;
}

/** Midpoint and edge-aligned rotation for a boat sitting between two points. */
export function edgeAnchor(p1: Point, p2: Point): { x: number; y: number; angle: number } {
    return {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
        angle: Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI) + 180,
    };
}
