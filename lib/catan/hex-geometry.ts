import { inchesToPixels } from '@/lib/dimensions';
import type { Hex, HexMetrics, Point, RowConfig } from './types';

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

/**
 * Neighbouring row/col pairs. Which hexes touch across rows depends on how the
 * rows are offset relative to each other, so the offset delta drives the
 * lookup rather than a fixed odd/even rule.
 */
export function neighbors(
    rows: readonly RowConfig[],
    rowIndex: number,
    colIndex: number
): Array<{ row: number; col: number }> {
    const result: Array<{ row: number; col: number }> = [];
    const row = rows[rowIndex];
    if (!row) return result;

    const push = (r: number, c: number, count: number) => {
        if (c >= 0 && c < count) result.push({ row: r, col: c });
    };

    // A hex straddles two hexes in the row above and two in the row below. Which
    // two depends on the sideways offset between the rows: when this row sits
    // further right, it lines up with columns c and c+1; when it sits further
    // left, with c-1 and c.
    const touching = (other: RowConfig) => (row.offset > other.offset ? 0 : -1);

    const prevRow = rows[rowIndex - 1];
    if (rowIndex > 0 && prevRow) {
        const shift = touching(prevRow);
        push(rowIndex - 1, colIndex + shift, prevRow.count);
        push(rowIndex - 1, colIndex + shift + 1, prevRow.count);
    }

    push(rowIndex, colIndex - 1, row.count);
    push(rowIndex, colIndex + 1, row.count);

    const nextRow = rows[rowIndex + 1];
    if (nextRow) {
        const shift = touching(nextRow);
        push(rowIndex + 1, colIndex + shift, nextRow.count);
        push(rowIndex + 1, colIndex + shift + 1, nextRow.count);
    }

    return result;
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

/**
 * Walks a `[row, col, vertex]` trace into a closed loop of pixel points.
 * Off-board steps are skipped with a warning rather than throwing, so a
 * half-finished coastline still renders while it is being authored.
 */
export function traceOutline(
    trace: ReadonlyArray<readonly [number, number, number]>,
    hexes: readonly Hex[],
    rows: readonly RowConfig[],
    metrics: HexMetrics
): Point[] {
    const points: Point[] = [];
    trace.forEach(([row, col, vertexIndex]) => {
        const vertices = verticesAt(hexes, rows, row, col, metrics);
        const point = vertices?.[vertexIndex];
        if (!point) {
            console.warn(`Skipping outline vertex at (${row}, ${col})[${vertexIndex}] — off board`);
            return;
        }
        points.push(point);
    });
    return points;
}

/** Midpoint and edge-aligned rotation for a boat sitting between two points. */
export function edgeAnchor(p1: Point, p2: Point): { x: number; y: number; angle: number } {
    return {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
        angle: Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI) + 180,
    };
}
