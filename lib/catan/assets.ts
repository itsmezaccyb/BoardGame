import { assetUrl } from '@/lib/asset-url';
import { RESOURCE_LOGOS_BY_STYLE } from '@/lib/building-costs';
import { PORT_TYPES } from './ports';
import { TILE_STYLES } from './styles';
import { TILE_TYPES } from './tiles';

/**
 * Every image the Catan page can possibly show, across all tile styles, board
 * variants and expansions.
 *
 * This is derived from the registries, so a new tile, port or style is picked
 * up for preloading automatically — there is no list to keep in sync.
 */
export function catanImageUrls(): string[] {
    const urls = new Set<string>();
    const add = (path: string | null | undefined) => {
        if (path) urls.add(assetUrl(path));
    };

    Object.values(TILE_TYPES).forEach(tile => Object.values(tile.images).forEach(add));

    Object.values(PORT_TYPES).forEach(port => {
        Object.values(port.art).forEach(add);
        Object.values(port.logo).forEach(add);
    });

    Object.values(TILE_STYLES).forEach(style => {
        add(style.background);
        add(style.port.baseImage);
    });

    Object.values(RESOURCE_LOGOS_BY_STYLE).forEach(logos => Object.values(logos).forEach(add));

    return Array.from(urls);
}
