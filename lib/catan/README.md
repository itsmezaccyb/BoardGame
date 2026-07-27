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

    outlines: [/* traced coastlines */],
    ports: { pool: /* ... */, anchors: /* ... */ },
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

### Layout strategies

`layouts.ts` has three ready-made ones:

| Strategy          | Use when                                                        |
| ----------------- | --------------------------------------------------------------- |
| `shuffledLayout`  | one land mass, one bag of tiles shuffled across it (classic)     |
| `islandLayout`    | a mainland plus small islands in open sea (Heading for New Shores) |
| `templateLayout`  | several hand-authored island arrangements, one picked per game (4 Islands) |

A layout is just `(ctx) => TileTypeId[]` — one tile id per hex in reading order
— so you can write your own if none of these fit. `ctx.rng` gives you
deterministic draws: pass a distinct `offset` per decision so unrelated parts
of the generator never disturb each other's results.

### Coastlines

An outline is a closed loop of `[row, col, vertexIndex]` triples traced
clockwise. Vertex indices run `0` = top, `1` = top-right, `2` = bottom-right,
`3` = bottom, `4` = bottom-left, `5` = top-left. Off-board steps are skipped
with a console warning rather than throwing, so a half-authored coastline still
renders.

Ports can then be anchored to pairs of point indices along that loop
(`outlinePortAnchors`), or directly to a hex edge (`templatePortAnchors`).

---

## Determinism

`generateBoard(variant, seed, metrics)` is pure: the same seed always produces
the same board. Nothing calls `Math.random()` inside the engine — the page
picks a seed and passes it in.
