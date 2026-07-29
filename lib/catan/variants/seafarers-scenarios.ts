import { MAP_LEGEND, RNG_OFFSET, coastPortAnchors, mapLayout, shuffledPortPool } from '../layouts';
import { buildNumberDistribution } from '../numbers';
import { takesNumberToken } from '../tiles';
import type { BoardVariant, PortTypeId, RowConfig, TileTypeId } from '../types';
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
 * Give it a name, a board size, a map and a pool. Everything else — number
 * tokens, coastline, harbours — follows from those.
 *
 * The map is one string per row, one character per hex:
 *
 *     ~  sea            ?  fog (face-down)     .  random tile from the pool
 *     F  forest         P  pasture             W  field (wheat)
 *     M  mountain       H  hill (brick)        G  gold       D  desert
 *
 * Row widths must match the board — `medium` is 5-6-7-8-7-6-5, `large` is
 * 7-8-9-10-9-8-7. A mismatched row, or a pool that does not fill the map's
 * `.` hexes, warns in the console rather than failing, so a half-edited map
 * still renders.
 *
 * Harbours place themselves around whatever coast the map produces, and the
 * number tokens are counted from the map, so redrawing a board never strands
 * a boat inland or leaves a tile without a number.
 */

/** The usual nine-harbour bag: one per resource plus four generic. */
const STANDARD_PORTS: PortTypeId[] = [
    'brick_2-1', 'sheep_2-1', 'rock_2-1', 'wood_2-1', 'wheat_2-1',
    'generic_3-1', 'generic_3-1', 'generic_3-1', 'generic_3-1',
];

/** Scenario names for the dropdown, collected as each board is defined below. */
export const SCENARIO_LABELS: Array<{ id: string; label: string }> = [];

interface ScenarioSpec {
    rows: RowConfig[];
    map: string[];
    pool: Partial<Record<TileTypeId, number>>;
    /** Harbours to spread around the coast. Defaults to the standard nine. */
    ports?: PortTypeId[];
}

/**
 * Works out how many number tokens a map needs, in classic proportions.
 *
 * Counting from the map means redrawing a board cannot leave it short of
 * tokens — a mistake that is otherwise invisible until a tile turns up blank.
 */
function numbersFor(spec: ScenarioSpec) {
    const cells = spec.map.join('').replace(/\s+/g, '').split('');

    const randomCells = cells.filter(cell => cell === '.').length;
    const poolTotal = Object.values(spec.pool).reduce<number>((sum, n) => sum + (n ?? 0), 0);
    if (poolTotal !== randomCells) {
        console.warn(
            `Scenario map has ${randomCells} random hexes but a pool of ${poolTotal} tiles`
        );
    }

    const fixed = cells.filter(cell => {
        const tile = MAP_LEGEND[cell];
        return tile !== undefined && tile !== 'random' && takesNumberToken(tile);
    }).length;

    const fromPool = Object.entries(spec.pool).reduce(
        (sum, [id, n]) => sum + (takesNumberToken(id) ? n ?? 0 : 0),
        0
    );

    return buildNumberDistribution(fixed + fromPool);
}

function scenario(id: string, name: string, spec: ScenarioSpec): BoardVariant {
    SCENARIO_LABELS.push({ id, label: name });

    const ports = spec.ports ?? STANDARD_PORTS;

    return {
        id: `seafarers:${id}:4`,
        expansion: 'seafarers',
        scenario: id,
        playerCount: 4,
        label: '4 Players',
        rows: spec.rows,
        board: {
            widthHexes: Math.max(...spec.rows.map(row => row.count)),
            heightRows: spec.rows.length,
        },
        numberDistribution: numbersFor(spec),
        layout: mapLayout({ map: spec.map, pool: spec.pool }),
        coastlines: [{ id: 'board', weight: 'island', region: 'land' }],
        ports: {
            pool: shuffledPortPool(ports, RNG_OFFSET.islandPorts),
            anchors: coastPortAnchors(ports.length),
        },
        display: SEAFARERS_DISPLAY.wide,
    };
}

/**
 * 3. The Fog Island — known coasts north and south with a bank of face-down
 * hexes between them. The fog hides the gold, and the desert.
 */
export const FOG_ISLAND = scenario('fog-island', 'The Fog Island', {
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
    // 14 visible hexes across the two coasts; the 14 fog hexes hold the rest.
    pool: { forest: 3, pasture: 3, field: 3, mountain: 3, hill: 2 },
});

/**
 * 4. Through the Desert — one continent split by a wall of desert, with gold
 * on isolated rocks out in the eastern sea.
 */
export const THROUGH_THE_DESERT = scenario('through-the-desert', 'Through the Desert', {
    rows: SEAFARERS_ROWS.large,
    map: [
        '~....~~',
        '~....D~~',
        '~.....D~~',
        '~.....D~~G',
        '~.....~G~',
        '~....~~G',
        '~...~~~',
    ],
    // Three deserts form the wall, per the rulebook, and the three gold rocks
    // are placed by hand; the bag fills the land either side of the wall.
    pool: { forest: 6, pasture: 6, field: 6, mountain: 6, hill: 6 },
});

/**
 * 5. The Forgotten Tribe — a mainland ringed by open water, with single-hex
 * outposts marooned in the corners, reachable only by ship.
 */
export const FORGOTTEN_TRIBE = scenario('forgotten-tribe', 'The Forgotten Tribe', {
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
    pool: { forest: 4, pasture: 4, field: 4, mountain: 3, hill: 3, desert: 1 },
});

/**
 * 6. Cloth for Catan — two home islands either side of a wide sea lane, with
 * tiny villages strung down the middle carrying the gold.
 */
export const CLOTH_FOR_CATAN = scenario('cloth-for-catan', 'Cloth for Catan', {
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
    pool: { forest: 6, pasture: 6, field: 5, mountain: 5, hill: 4, desert: 2 },
});

/**
 * 7. The Pirate Islands — strips of land down each flank and a two-hex pirate
 * fortress adrift in the middle, holding the gold everyone wants.
 */
export const PIRATE_ISLANDS = scenario('pirate-islands', 'The Pirate Islands', {
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
    pool: { forest: 6, pasture: 6, field: 5, mountain: 5, hill: 4, desert: 2 },
});

/**
 * 8. The Wonders of Catan — one great landmass filling most of the board, with
 * a diagonal chain of gold islands trailing away to the south-east.
 */
export const WONDERS_OF_CATAN = scenario('wonders-of-catan', 'The Wonders of Catan', {
    rows: SEAFARERS_ROWS.large,
    map: [
        '~....~~',
        '~.....~~',
        '~......~~',
        '~.......~~',
        '~.....~G~',
        '~....~G~',
        '~...~G~',
    ],
    // 34 mainland hexes with the deserts scattered through them, not on the rim.
    pool: { forest: 6, pasture: 6, field: 6, mountain: 6, hill: 5, desert: 5 },
});

/**
 * 9. New World — everything face-down but a small safe harbour in the
 * north-west. The whole board gets discovered in play.
 */
export const NEW_WORLD = scenario('new-world', 'New World', {
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
    // The safe harbour: the only tiles face-up at the start.
    pool: { forest: 2, pasture: 1, field: 1, mountain: 1 },
    // Uncharted water needs no trade routes yet.
    ports: ['generic_3-1', 'generic_3-1', 'generic_3-1'],
});

export const SCENARIO_VARIANTS = [
    FOG_ISLAND,
    THROUGH_THE_DESERT,
    FORGOTTEN_TRIBE,
    CLOTH_FOR_CATAN,
    PIRATE_ISLANDS,
    WONDERS_OF_CATAN,
    NEW_WORLD,
];
