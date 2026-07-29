# Catan board engine

Everything the Catan page needs is described as **data in registries**. Adding
content means adding an entry; you should not need to touch generation or
rendering code.

```
lib/catan/
  types.ts             shared vocabulary
  random.ts            deterministic draws (same seed -> same board)
  hex-geometry.ts      rows/columns -> pixels, adjacency, coastline tracing
  tiles.ts             WHAT can sit on a hex          <- add tile types
  ports.ts             WHAT can sit on a coastline    <- add port types
  styles.ts            HOW it all looks               <- add visual styles
  numbers.ts           dice-token placement rules
  layouts.ts           reusable tile-placement strategies
  variants/            WHICH boards exist             <- add game modes
  generator.ts         runs a variant into a board

components/catan/      rendering; reads only the registries above
app/catan/page.tsx     just holds the player's current selections
```

---

## Add a new tile type

1. Add an entry to `TILE_TYPES` in `tiles.ts`:

```ts
swamp: {
    id: 'swamp',
    label: 'Swamp',
    category: 'land',
    producesResource: true,   // false = no number token (like desert)
    resource: 'brick',        // links it to the building-cost legend
    images: {
        classic: '/images/catan_swamp.png',
        simple:  '/images/catan_swamp_style.jpg',
    },
},
```

2. Use `'swamp'` in a variant's tile pool.

That's it. Number tokens, hex borders, coastlines and rendering all read the
registry. A tile with no image for the current style renders as a plain hex.

---

## Add a new port type

Add an entry to `PORT_TYPES` in `ports.ts`, then use its id in a variant's port
pool. `art` is the bespoke boat image a style uses in `'art'` mode; `logo` is
the icon stamped onto the shared boat in `'overlay'` mode.

---

## Add a new visual style

Add an entry to `TILE_STYLES` in `styles.ts`, then add a matching key to the
`images` of each tile and the `art`/`logo` of each port. The style picker in
the settings panel is generated from the registry, so it appears automatically.

A style controls the page background, hex borders, water outlines, the stroke
layers used for each coastline weight, and how port boats are drawn.

---

## Add a new game mode (scenario / expansion)

Create a file in `variants/` exporting one `BoardVariant` per player count.
`classic.ts` is the simplest example; the two Seafarers files show the more
involved shapes.

```ts
export const MY_SCENARIO_4P: BoardVariant = {
    id: 'seafarers:my-scenario:4',
    expansion: 'seafarers',
    scenario: 'my-scenario',
    playerCount: 4,
    label: '4 Players',

    rows: SEAFARERS_ROWS.medium,          // board shape
    board: { widthHexes: 8, heightRows: 7 },

    numberDistribution: { 2: 2, 3: 3, /* ... */ 12: 1 },

    layout: islandLayout({ /* ... */ }),  // decides every hex's tile

    coastlines: [{ id: 'mainland', weight: 'island', region: 'land' }],
    ports: {
        pool: shuffledPortPool(['wood_2-1', 'generic_3-1', /* ... */], 1000),
        anchors: fixedPortAnchors([
            { hex: 4, side: 'nw' },
            { hex: 11, side: 'e' },
        ]),
    },
    display: SEAFARERS_DISPLAY.wide,      // rotation, margins, artwork mode
};
```

Then register it in `variants/index.ts`:

```ts
export const BOARD_VARIANTS = [..., ...MY_SCENARIO_VARIANTS];
export const SCENARIOS = [
    ...,
    { id: 'my-scenario', expansion: 'seafarers', label: 'My Scenario' },
];
```

The scenario dropdown and the player-count buttons are built from the registry,
so the new mode shows up in the settings panel with no UI changes.

### Custom boards

`custom.ts` builds a `BoardVariant` from a plain, serialisable config, so a
player-built board runs through exactly the same generator, renderer and
coastline code as the built-in ones:

```ts
buildCustomVariant({
    sizeIndex: 2,                                  // index into BOARD_SIZES
    tileCounts: { forest: 6, pasture: 5, ... },    // the bag to shuffle in
    locked: { 12: 'water', 13: 'water' },          // hexes pinned by hand
    ports: [{ hex: 4, side: 'nw', portType: 'wood_2-1' }],
})
```

`BOARD_SIZES` starts as regular hexagons, then caps at `MAX_BOARD_ROWS` (7) and
widens instead — the board is drawn at a fixed physical scale rather than being
shrunk to fit, so a taller board would run off the bottom of the screen. The
largest is `8-9-10-11-10-9-8`.

Any other outline comes from pinning hexes to `water` and letting the derived
coastline follow the result — which is why there is no row editor.

Number tokens are sized to the board: `buildNumberDistribution(n)` spreads `n`
tokens across 2-12 in classic proportions using largest-remainder allocation,
so the totals always add up whatever the board size.

`autoPlacePorts()` spreads harbours evenly around the longest coastline; after
that they are ordinary anchors the player can add or remove one at a time.

### Layout strategies

`layouts.ts` has four ready-made ones:

| Strategy          | Use when                                                        |
| ----------------- | --------------------------------------------------------------- |
| `mapLayout`       | **easiest** — draw the board as text (all rulebook scenarios)    |
| `shuffledLayout`  | one land mass, one bag of tiles shuffled across it (classic)     |
| `islandLayout`    | a mainland plus small islands in open sea (Heading for New Shores) |
| `templateLayout`  | several hand-authored island arrangements, one picked per game (4 Islands) |

`mapLayout` is the quickest way to add a scenario — you draw it:

```ts
map: [
    '~...~',
    '~....~',
    '~~???~~',      // ~ sea   ? fog   . random tile from the pool
    '~??????~',     // F P W M H  fixed forest/pasture/field/mountain/hill
    '~?????~',      // G gold    D desert
    '~....~',
    '~...~',
],
pool: { forest: 3, pasture: 3, field: 3, mountain: 3, hill: 2 },
```

Row widths must match the board's rows; a mismatch warns in the console rather
than failing, so a half-edited map still renders. See
`variants/seafarers-scenarios.ts`, where each of the seven rulebook scenarios
is a map plus a pool and nothing else — number tokens are counted from the map
and harbours place themselves around the resulting coast.

A layout is just `(ctx) => TileTypeId[]` — one tile id per hex in reading order
— so you can write your own if none of these fit. `ctx.rng` gives you
deterministic draws: pass a distinct `offset` per decision so unrelated parts
of the generator never disturb each other's results.

### Coastlines

You do not draw coastlines — you say which hexes they wrap, and the shape is
derived by walking the sides that have no neighbour on the same side:

```ts
coastlines: [
    { id: 'board', weight: 'board', region: 'land' },        // every land hex
    { id: 'mainland', weight: 'island', region: MAINLAND },  // one landmass
]
```

`region` accepts:

| Value                    | Meaning                                                   |
| ------------------------ | --------------------------------------------------------- |
| `'land'`                 | every non-water hex on the generated board                 |
| `number[]`               | explicit 1-based hex indices — one landmass among several  |
| `(ctx) => number[]`      | computed per game, for boards whose land varies            |

Scattered land produces **one closed loop per island** automatically, so an
archipelago outlines each island with no extra work.

`weight` (`'board'` or `'island'`) selects which stroke stack the current tile
style uses — see `styles.ts`.

### Ports

A port moors against **one side of one hex**:

```ts
anchors: fixedPortAnchors([
    { hex: 12, side: 'e' },
    { hex: 16, side: 'se' },
])
```

Sides are named clockwise: `ne`, `e`, `se`, `sw`, `w`, `nw`. Anchors are
independent of the coastline, so reshaping an island never moves its harbours.

Use `templatePortAnchors` instead when the board picks between hand-authored
arrangements — each template carries its own ports, so the two stay in step.

To find the side you want, note that hexes are numbered in reading order
starting at 1 (row 0 left to right, then row 1, ...), and `side` is the
direction the boat faces away from that hex.

---

## Determinism

`generateBoard(variant, seed, metrics)` is pure: the same seed always produces
the same board. Nothing calls `Math.random()` inside the engine — the page
picks a seed and passes it in.
