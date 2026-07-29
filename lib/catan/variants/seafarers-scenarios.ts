import { MAP_LEGEND, RNG_OFFSET, coastPortAnchors, mapLayout, shuffledPortPool } from '../layouts';
import { buildNumberDistribution } from '../numbers';
import { scaleTileCounts } from '../custom';
import { takesNumberToken } from '../tiles';
import type { BoardVariant, PlayerCount, PortTypeId, RowConfig, TileTypeId } from '../types';
import { SEAFARERS_DISPLAY, SEAFARERS_ROWS } from './seafarers-common';

/**
 * The remaining Seafarers scenarios, drawn as text maps.
 *
 * Layouts follow `CATAN_SEAFARERS_RULES.md` in the repository root: each keeps
 * that scenario's distinctive geography — the fog bank, the desert wall, the
 * marooned outposts — and its documented tile mix, fitted to the board sizes
 * this app renders.
 *
 * ---------------------------------------------------------------------------
 * TO ADD OR EDIT A SCENARIO
 * ---------------------------------------------------------------------------
 * Give it a name and a board per player count. Everything else — number
 * tokens, coastline, harbours — follows from the map.
 *
 * The map is one string per row, one character per hex:
 *
 *     ~  sea            ?  face-down       .  random tile from the pool
 *     F  forest         P  pasture         W  field (wheat)
 *     M  mountain       H  hill (brick)    G  gold       D  desert
 *
 * `?` hexes hold real tiles dealt from the `hidden` bag — fog is a cover, not
 * a kind of terrain — so they are laid out and numbered like anything else and
 * simply start face-down.
 *
 * Row widths must match the board: `small` is 4-5-6-7-6-5-4, `medium` is
 * 5-6-7-8-7-6-5, `large` is 7-8-9-10-9-8-7. A mismatched row, or a pool that
 * does not fill the map's `.` hexes, warns in the console rather than failing.
 */

/** The usual nine-harbour bag: one per resource plus four generic. */
const STANDARD_PORTS: PortTypeId[] = [
    'brick_2-1', 'sheep_2-1', 'rock_2-1', 'wood_2-1', 'wheat_2-1',
    'generic_3-1', 'generic_3-1', 'generic_3-1', 'generic_3-1',
];

/** Scenario names for the dropdown, collected as each scenario is defined. */
export const SCENARIO_LABELS: Array<{ id: string; label: string }> = [];

interface BoardSpec {
    rows: RowConfig[];
    map: string[];
    /**
     * The flavour of the board, as proportions rather than exact counts.
     *
     * Scaled to however many `.` hexes the map has, so redrawing a board never
     * leaves the bag the wrong size — a mistake that otherwise shows up as
     * stray desert where the tiles ran out.
     */
    mix: Partial<Record<TileTypeId, number>>;
    /** Proportions for the face-down tiles under the map's `?` hexes. */
    hiddenMix?: Partial<Record<TileTypeId, number>>;
    /** Harbours to spread around the coast. Defaults to the standard nine. */
    ports?: PortTypeId[];
}

const countCells = (map: string[], symbol: string) =>
    map.join('').replace(/[^-!-~]/g, '').split('').filter(cell => cell === symbol).length;

/** The bags this board actually deals, sized to fit its map exactly. */
function bagsFor(spec: BoardSpec) {
    return {
        pool: scaleTileCounts(spec.mix as Record<TileTypeId, number>, countCells(spec.map, '.')),
        hidden: scaleTileCounts(
            (spec.hiddenMix ?? {}) as Record<TileTypeId, number>,
            countCells(spec.map, '?')
        ),
    };
}

/**
 * Works out how many number tokens a board needs, in classic proportions.
 *
 * Counting from the map means redrawing a board cannot leave it short of
 * tokens — a mistake that is otherwise invisible until a tile turns up blank.
 * Face-down hexes count too: they hold real tiles that need numbers waiting
 * underneath for when they are turned over.
 */
function numbersFor(spec: BoardSpec) {
    const cells = spec.map.join('').replace(/[^-!-~]/g, '').split('');
    const { pool, hidden } = bagsFor(spec);

    const fixed = cells.filter(cell => {
        const tile = MAP_LEGEND[cell];
        return tile !== undefined && tile !== 'random' && tile !== 'hidden' && takesNumberToken(tile);
    }).length;

    const fromBags = [pool, hidden].reduce(
        (sum, bag) =>
            sum + Object.entries(bag).reduce(
                (total, [id, n]) => total + (takesNumberToken(id) ? n : 0),
                0
            ),
        0
    );

    return buildNumberDistribution(fixed + fromBags);
}

function board(id: string, playerCount: PlayerCount, spec: BoardSpec): BoardVariant {
    const ports = spec.ports ?? STANDARD_PORTS;
    return {
        id: `seafarers:${id}:${playerCount}`,
        expansion: 'seafarers',
        scenario: id,
        playerCount,
        label: `${playerCount} Players`,
        rows: spec.rows,
        board: {
            widthHexes: Math.max(...spec.rows.map(row => row.count)),
            heightRows: spec.rows.length,
        },
        numberDistribution: numbersFor(spec),
        layout: mapLayout({ map: spec.map, ...bagsFor(spec) }),
        coastlines: [{ id: 'board', weight: 'island', region: 'land' }],
        ports: {
            pool: shuffledPortPool(ports, RNG_OFFSET.islandPorts),
            anchors: coastPortAnchors(ports.length),
        },
        display: SEAFARERS_DISPLAY.wide,
    };
}

/** Registers one scenario at every player count it supports. */
function scenario(
    id: string,
    name: string,
    boards: Partial<Record<3 | 4 | 6, BoardSpec>>
): BoardVariant[] {
    SCENARIO_LABELS.push({ id, label: name });
    return ([3, 4, 6] as const)
        .filter(count => boards[count])
        .map(count => board(id, count, boards[count]!));
}

/** Harbour bags sized to the board. */
const SMALL_PORTS = STANDARD_PORTS.slice(0, 7);
const LARGE_PORTS: PortTypeId[] = [...STANDARD_PORTS, 'generic_3-1', 'sheep_2-1'];

// ---------------------------------------------------------------------------
// 3. The Fog Island
// ---------------------------------------------------------------------------

/**
 * Known coasts north and south with a bank of face-down hexes between them.
 * The fog holds the gold — and the desert. Click a hex to turn it over.
 */
export const FOG_ISLAND = scenario('fog-island', 'The Fog Island', {
    3: {
        rows: SEAFARERS_ROWS.small,
        map: [
            '~..~',
            '~...~',
            '~~??~~',
            '~?????~',
            '~~??~~',
            '~...~',
            '~..~',
        ],
        mix: { forest: 2, pasture: 2, field: 2, mountain: 2, hill: 2 },
        hiddenMix: { forest: 1, pasture: 1, field: 2, mountain: 1, hill: 2, gold: 1, desert: 1 },
        ports: SMALL_PORTS,
    },
    4: {
        rows: SEAFARERS_ROWS.medium,
        map: [
            '~...~',
            '~....~',
            '~~???~~',
            '~??????~',
            '~?????~',
            '~....~',
            '~...~',
        ],
        mix: { forest: 3, pasture: 3, field: 3, mountain: 3, hill: 2 },
        // Two gold and the desert hide in the fog; none are face-up.
        hiddenMix: { forest: 2, pasture: 2, field: 2, mountain: 2, hill: 3, gold: 2, desert: 1 },
    },
    6: {
        rows: SEAFARERS_ROWS.large,
        map: [
            '~.....~',
            '~......~',
            '~~?????~~',
            '~????????~',
            '~???????~',
            '~......~',
            '~.....~',
        ],
        mix: { forest: 5, pasture: 5, field: 4, mountain: 4, hill: 4 },
        hiddenMix: { forest: 3, pasture: 3, field: 4, mountain: 4, hill: 4, gold: 3, desert: 2 },
        ports: LARGE_PORTS,
    },
});

// ---------------------------------------------------------------------------
// 4. Through the Desert
// ---------------------------------------------------------------------------

/**
 * A wall of desert cuts through the middle of the continent, forcing players
 * to route around it, with gold on isolated rocks out in the eastern sea.
 */
export const THROUGH_THE_DESERT = scenario('through-the-desert', 'Through the Desert', {
    3: {
        rows: SEAFARERS_ROWS.small,
        map: [
            '~..~',
            '~...~',
            '~.D..~',
            '~..D..~',
            '~.D.~G',
            '~..~G',
            '~.~G',
        ],
        mix: { forest: 5, pasture: 5, field: 5, mountain: 4, hill: 4 },
        ports: SMALL_PORTS,
    },
    4: {
        rows: SEAFARERS_ROWS.medium,
        map: [
            '~...~',
            '~....~',
            '~..D..~',
            '~...D..~',
            '~..D.~G',
            '~...~G',
            '~..~G',
        ],
        // Three deserts form the wall, per the rulebook, and the three gold
        // rocks sit apart in the sea; the bag fills the land around them.
        mix: { forest: 6, pasture: 6, field: 6, mountain: 6, hill: 6 },
    },
    6: {
        rows: SEAFARERS_ROWS.large,
        map: [
            '~.....~',
            '~......~',
            '~...D...~',
            '~....D...~',
            '~...D..~G',
            '~.....~G',
            '~....~G',
        ],
        mix: { forest: 9, pasture: 9, field: 9, mountain: 8, hill: 8 },
        ports: LARGE_PORTS,
    },
});

// ---------------------------------------------------------------------------
// 5. The Forgotten Tribe
// ---------------------------------------------------------------------------

/**
 * A mainland ringed by open water, with single-hex outposts marooned in the
 * corners — reachable only by ship.
 */
export const FORGOTTEN_TRIBE = scenario('forgotten-tribe', 'The Forgotten Tribe', {
    3: {
        rows: SEAFARERS_ROWS.small,
        map: [
            'G~~G',
            '~~..~',
            '~....~',
            '~~....~',
            '~....~',
            '~~..~',
            'M~~F',
        ],
        mix: { forest: 3, pasture: 3, field: 3, mountain: 3, hill: 2 },
        ports: SMALL_PORTS,
    },
    4: {
        rows: SEAFARERS_ROWS.medium,
        map: [
            'G~~~G',
            '~~..~~',
            '~.....~',
            '~~.....~',
            '~.....~',
            '~~..~~',
            'M~~~F',
        ],
        // 19 mainland hexes; the four corner outposts are placed by hand.
        mix: { forest: 4, pasture: 4, field: 4, mountain: 3, hill: 3, desert: 1 },
    },
    6: {
        rows: SEAFARERS_ROWS.large,
        map: [
            'G~~~~~G',
            '~~~...~~',
            '~~.....~~',
            '~~~......~',
            '~~.....~~',
            '~~~...~~',
            'M~~~~~F',
        ],
        mix: { forest: 5, pasture: 5, field: 5, mountain: 5, hill: 5, desert: 2 },
        ports: LARGE_PORTS,
    },
});

// ---------------------------------------------------------------------------
// 6. Cloth for Catan
// ---------------------------------------------------------------------------

/**
 * Two home islands either side of a wide sea lane, with tiny villages strung
 * down the middle carrying the gold.
 */
export const CLOTH_FOR_CATAN = scenario('cloth-for-catan', 'Cloth for Catan', {
    3: {
        rows: SEAFARERS_ROWS.small,
        map: [
            '.~~.',
            '..~..',
            '..~G..',
            '..~~~..',
            '..~G..',
            '..~..',
            '.~~.',
        ],
        mix: { forest: 4, pasture: 4, field: 4, mountain: 4, hill: 3, desert: 2 },
        ports: SMALL_PORTS,
    },
    4: {
        rows: SEAFARERS_ROWS.medium,
        map: [
            '..~..',
            '..~~..',
            '..~G~..',
            '..~~~~..',
            '..~G~..',
            '..~~..',
            '..~..',
        ],
        // 28 hexes split between the two home islands.
        mix: { forest: 6, pasture: 6, field: 5, mountain: 5, hill: 4, desert: 2 },
    },
    6: {
        rows: SEAFARERS_ROWS.large,
        map: [
            '...~...',
            '...~~...',
            '...~G~...',
            '...~~~~...',
            '...~G~...',
            '...~~...',
            '...~...',
        ],
        mix: { forest: 9, pasture: 9, field: 8, mountain: 8, hill: 7, desert: 3 },
        ports: LARGE_PORTS,
    },
});

// ---------------------------------------------------------------------------
// 7. The Pirate Islands
// ---------------------------------------------------------------------------

/**
 * Strips of land down each flank and a two-hex pirate fortress adrift in the
 * middle, holding the gold everyone wants.
 */
export const PIRATE_ISLANDS = scenario('pirate-islands', 'The Pirate Islands', {
    3: {
        rows: SEAFARERS_ROWS.small,
        map: [
            '.~~.',
            '..~..',
            '..~~..',
            '..~GG..',
            '..~~..',
            '..~..',
            '.~~.',
        ],
        mix: { forest: 4, pasture: 4, field: 4, mountain: 4, hill: 3, desert: 2 },
        ports: SMALL_PORTS,
    },
    4: {
        rows: SEAFARERS_ROWS.medium,
        map: [
            '..~..',
            '..~~..',
            '..~~~..',
            '..~GG~..',
            '..~~~..',
            '..~~..',
            '..~..',
        ],
        // 28 hexes across the two flanking strips.
        mix: { forest: 6, pasture: 6, field: 5, mountain: 5, hill: 4, desert: 2 },
    },
    6: {
        rows: SEAFARERS_ROWS.large,
        map: [
            '...~...',
            '...~~...',
            '...~~~...',
            '...~GG~...',
            '...~~~...',
            '...~~...',
            '...~...',
        ],
        mix: { forest: 9, pasture: 9, field: 8, mountain: 8, hill: 7, desert: 3 },
        ports: LARGE_PORTS,
    },
});

// ---------------------------------------------------------------------------
// 8. The Wonders of Catan
// ---------------------------------------------------------------------------

/**
 * One great landmass filling most of the board, with a diagonal chain of gold
 * islands trailing away to the south-east.
 */
export const WONDERS_OF_CATAN = scenario('wonders-of-catan', 'The Wonders of Catan', {
    3: {
        rows: SEAFARERS_ROWS.small,
        map: [
            '~..~',
            '~...~',
            '~....~',
            '~.....~',
            '~..~G~',
            '~.~G~',
            '~~G~',
        ],
        mix: { forest: 4, pasture: 4, field: 4, mountain: 3, hill: 3, desert: 3 },
        ports: SMALL_PORTS,
    },
    4: {
        rows: SEAFARERS_ROWS.medium,
        map: [
            '~...~',
            '~....~',
            '~.....~',
            '~......~',
            '~...~G~',
            '~..~G~',
            '~.~G~',
        ],
        // Deserts scatter through the mainland rather than sitting on the rim.
        mix: { forest: 6, pasture: 5, field: 5, mountain: 5, hill: 5, desert: 5 },
    },
    6: {
        rows: SEAFARERS_ROWS.large,
        map: [
            '~.....~',
            '~......~',
            '~.......~',
            '~........~',
            '~.....~G~',
            '~....~G~',
            '~...~G~',
        ],
        mix: { forest: 9, pasture: 8, field: 8, mountain: 8, hill: 8, desert: 5 },
        ports: LARGE_PORTS,
    },
});

// ---------------------------------------------------------------------------
// 9. New World
// ---------------------------------------------------------------------------

/**
 * Everything face-down but a small safe harbour in the north-west. The whole
 * board is discovered by turning hexes over as you go.
 */
const UNCHARTED_PORTS: PortTypeId[] = ['generic_3-1', 'generic_3-1', 'generic_3-1'];

export const NEW_WORLD = scenario('new-world', 'New World', {
    3: {
        rows: SEAFARERS_ROWS.small,
        map: [
            '..??',
            '..???',
            '~?????',
            '~??????',
            '~?????',
            '~????',
            '????',
        ],
        mix: { forest: 2, pasture: 1, field: 1 },
        hiddenMix: {
            forest: 5, pasture: 5, field: 5, mountain: 5, hill: 5, gold: 2, desert: 2,
        },
        ports: UNCHARTED_PORTS,
    },
    4: {
        rows: SEAFARERS_ROWS.medium,
        map: [
            '..~??',
            '...???',
            '~~?????',
            '~??????~',
            '~?????~',
            '~????~',
            '?????',
        ],
        mix: { forest: 2, pasture: 1, field: 1, mountain: 1 },
        // The whole unexplored stack: resources, gold and desert, shuffled.
        hiddenMix: {
            forest: 6, pasture: 6, field: 5, mountain: 5, hill: 5, gold: 2, desert: 1,
        },
        ports: UNCHARTED_PORTS,
    },
    6: {
        rows: SEAFARERS_ROWS.large,
        map: [
            '...~???',
            '....????',
            '~~??????~',
            '~????????~',
            '~???????~',
            '~??????~',
            '???????',
        ],
        mix: { forest: 3, pasture: 2, field: 2 },
        hiddenMix: {
            forest: 8, pasture: 8, field: 8, mountain: 7, hill: 7, gold: 3, desert: 2,
        },
        ports: UNCHARTED_PORTS,
    },
});

export const SCENARIO_VARIANTS = [
    ...FOG_ISLAND,
    ...THROUGH_THE_DESERT,
    ...FORGOTTEN_TRIBE,
    ...CLOTH_FOR_CATAN,
    ...PIRATE_ISLANDS,
    ...WONDERS_OF_CATAN,
    ...NEW_WORLD,
];
