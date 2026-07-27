import {
    buildGrid,
    edgeAnchor,
    hexCenter,
    hexVertices,
    indexToRowCol,
    neighbors,
    rowColToIndex,
    totalHexCount,
    traceOutline,
} from './hex-geometry';
import { assignNumbers } from './numbers';
import { createRng } from './random';
import { WATER_TILE } from './tiles';
import type {
    BoardVariant,
    GeneratedBoard,
    GenerationContext,
    Hex,
    HexMetrics,
    PortAnchors,
    PortPlacement,
    Point,
    RenderedOutline,
    RowConfig,
} from './types';

/**
 * Turns a `BoardVariant` plus a seed into a fully placed board.
 *
 * The pipeline is fixed — grid, tiles, numbers, coastlines, ports — and every
 * step that differs between game modes is delegated to the variant.
 */
export function generateBoard(
    variant: BoardVariant,
    seed: number,
    metrics: HexMetrics
): GeneratedBoard {
    const rows = variant.rows;
    const rng = createRng(seed);

    const ctx: GenerationContext = {
        variant,
        rows,
        hexCount: totalHexCount(rows),
        metrics,
        rng,
    };

    const hexes = buildGrid(rows, metrics, variant.display?.verticalOffsetRows ?? 0);

    const tileIds = variant.layout(ctx);
    hexes.forEach(hex => {
        hex.tileType = tileIds[hex.index] ?? WATER_TILE;
    });

    assignNumbers(hexes, rows, variant.numberDistribution, rng);

    const outlines: RenderedOutline[] = (variant.outlines ?? []).map(spec => ({
        id: spec.id,
        weight: spec.weight,
        points: traceOutline(spec.trace, hexes, rows, metrics),
    }));

    const ports = placePorts(variant, ctx, hexes, outlines);

    return {
        variant,
        seed,
        metrics,
        rows,
        hexes,
        outlines,
        ports,
        width: variant.board.widthHexes * metrics.width,
        height: variant.board.heightRows * metrics.verticalSpacing + metrics.height,
    };
}

function placePorts(
    variant: BoardVariant,
    ctx: GenerationContext,
    hexes: Hex[],
    outlines: RenderedOutline[]
): PortPlacement[] {
    if (!variant.ports) return [];

    const pool = variant.ports.pool(ctx);
    const anchors = variant.ports.anchors(ctx);
    const edges = resolveAnchorEdges(anchors, ctx, hexes, outlines);

    const placements: PortPlacement[] = [];
    edges.forEach((edge, idx) => {
        const portType = pool[idx];
        if (!edge || !portType) return;
        placements.push({ portType, ...edgeAnchor(edge[0], edge[1]) });
    });

    if (edges.length > pool.length) {
        console.warn(
            `${variant.id}: ${edges.length} port anchors but only ${pool.length} port types`
        );
    }

    return placements;
}

/** Resolves each anchor into the two points its boat should straddle. */
function resolveAnchorEdges(
    anchors: PortAnchors,
    ctx: GenerationContext,
    hexes: Hex[],
    outlines: RenderedOutline[]
): Array<[Point, Point] | null> {
    if (anchors.kind === 'outline') {
        const outline = outlines.find(o => o.id === anchors.outlineId);
        if (!outline) {
            console.warn(`Port anchors reference unknown outline "${anchors.outlineId}"`);
            return [];
        }
        return anchors.pairs.map(([a, b]) => {
            const p1 = outline.points[a];
            const p2 = outline.points[b];
            return p1 && p2 ? [p1, p2] : null;
        });
    }

    return anchors.edges.map(edge => {
        const hex = hexes[edge.hexIndex - 1];
        if (!hex) {
            console.warn(`Port anchored to missing hex ${edge.hexIndex}`);
            return null;
        }
        const center = hexCenter(hex, ctx.metrics);
        const vertices = hexVertices(center.x, center.y, ctx.metrics);
        const p1 = vertices[edge.vertex1];
        const p2 = vertices[edge.vertex2];
        return p1 && p2 ? [p1, p2] : null;
    });
}

/**
 * Counts how many neighbours of a hex share a tile type. Useful for layout
 * rules that want to avoid clumping when authoring a new scenario.
 */
export function countAdjacentTiles(
    hexes: readonly Hex[],
    rows: readonly RowConfig[],
    index: number,
    tileType: string
): number {
    const coords = indexToRowCol(rows, index);
    if (!coords) return 0;
    return neighbors(rows, coords.row, coords.col).filter(
        ({ row, col }) => hexes[rowColToIndex(rows, row, col)]?.tileType === tileType
    ).length;
}
