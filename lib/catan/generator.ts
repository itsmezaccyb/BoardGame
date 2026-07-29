import {
    buildGrid,
    deriveCoastline,
    edgeAnchor,
    indexToRowCol,
    neighbors,
    rowColToIndex,
    sideEndpoints,
    totalHexCount,
} from './hex-geometry';
import { assignNumbers } from './numbers';
import { createRng } from './random';
import { isWater, WATER_TILE } from './tiles';
import type {
    BoardVariant,
    CoastlineRegion,
    GeneratedBoard,
    GenerationContext,
    Hex,
    HexMetrics,
    PortPlacement,
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

    // The grid comes first so port placement can see where the coast ends up;
    // the layout fills in the tile types below.
    const hexes = buildGrid(rows, metrics, variant.display?.verticalOffsetRows ?? 0);

    const ctx: GenerationContext = {
        variant,
        rows,
        hexCount: totalHexCount(rows),
        metrics,
        rng,
        hexes,
    };

    const result = variant.layout(ctx);
    const tileIds = Array.isArray(result) ? result : result.tiles;
    const fogged = new Set(Array.isArray(result) ? [] : result.fogged ?? []);

    hexes.forEach(hex => {
        hex.tileType = tileIds[hex.index] ?? WATER_TILE;
        // The tile underneath is real; only its visibility differs.
        if (fogged.has(hex.index + 1)) hex.fogged = true;
    });

    assignNumbers(hexes, rows, variant.numberDistribution, rng);

    const outlines: RenderedOutline[] = (variant.coastlines ?? []).map(spec => ({
        id: spec.id,
        weight: spec.weight,
        loops: deriveCoastline(hexes, rows, metrics, insideRegion(spec.region, ctx)),
    }));

    const ports = placePorts(variant, ctx, hexes);

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

/** Turns a coastline region into a membership test over the generated hexes. */
function insideRegion(
    region: CoastlineRegion,
    ctx: GenerationContext
): (hex: Hex) => boolean {
    // A face-down hex counts as land whatever is under it, so the coastline
    // cannot be read to work out what the fog is hiding.
    if (region === 'land') return hex => hex.fogged === true || !isWater(hex.tileType);

    const indices = new Set(typeof region === 'function' ? region(ctx) : region);
    return hex => indices.has(hex.index + 1);
}

function placePorts(
    variant: BoardVariant,
    ctx: GenerationContext,
    hexes: Hex[]
): PortPlacement[] {
    if (!variant.ports) return [];

    const pool = variant.ports.pool(ctx);
    const anchors = variant.ports.anchors(ctx);

    if (anchors.length > pool.length) {
        console.warn(
            `${variant.id}: ${anchors.length} port anchors but only ${pool.length} port types`
        );
    }

    const placements: PortPlacement[] = [];
    anchors.forEach((anchor, idx) => {
        const portType = pool[idx];
        if (!portType) return;

        const hex = hexes[anchor.hex - 1];
        if (!hex) {
            console.warn(`${variant.id}: port anchored to hex ${anchor.hex}, which is off board`);
            return;
        }

        const [p1, p2] = sideEndpoints(hex, anchor.side, ctx.metrics);
        placements.push({ portType, ...edgeAnchor(p1, p2) });
    });

    return placements;
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
