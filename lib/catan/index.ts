/**
 * Catan board engine.
 *
 * Layer map (each layer only depends on the ones above it):
 *
 *   types.ts          shared vocabulary
 *   random.ts         deterministic draws
 *   hex-geometry.ts   rows/columns → pixels, adjacency
 *   tiles.ts          WHAT can sit on a hex        ← add tile types here
 *   ports.ts          WHAT can sit on a coastline  ← add port types here
 *   styles.ts         HOW it all looks             ← add visual styles here
 *   numbers.ts        dice-token placement rules
 *   layouts.ts        reusable tile-placement strategies
 *   variants/         WHICH boards exist           ← add game modes here
 *   generator.ts      runs a variant into a board
 *
 * Rendering lives in `components/catan/` and reads only the registries above.
 */

export * from './types';
export * from './random';
export * from './hex-geometry';
export * from './tiles';
export * from './ports';
export * from './styles';
export * from './numbers';
export * from './layouts';
export * from './generator';
export * from './variants';
