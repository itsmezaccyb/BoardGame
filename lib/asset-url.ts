import optimized from './generated/optimized-images.json';

/**
 * Resolves an image path to the smallest available copy.
 *
 * `scripts/optimize-images.js` writes display-sized versions of the board art
 * into `public/images/optimized/` and records them in the manifest imported
 * above. Anything without an entry — because it is already small enough, or
 * because the script has not been run — falls through to the original path, so
 * this is always safe to call.
 */
const OPTIMIZED: Record<string, string> = optimized;

export function assetUrl(path: string): string {
    return OPTIMIZED[path] ?? path;
}

/** Every optimized asset, for preloading. */
export function optimizedAssets(): string[] {
    return Object.values(OPTIMIZED);
}
