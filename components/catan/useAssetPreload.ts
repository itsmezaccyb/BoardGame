'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Downloads and decodes every image up front, then holds a reference to each.
 *
 * Without this, switching tile style or expansion fetches artwork for the
 * first time mid-game, which on a Raspberry Pi shows up as tiles popping in
 * one by one. Decoding here too means the browser has the bitmap ready, not
 * just the compressed bytes — decode is the expensive half on slow hardware.
 *
 * Holding the `Image` objects keeps the decoded frames from being evicted
 * under memory pressure, which is the trade we want on a kiosk: more RAM used,
 * no stalls during play.
 */
export function useAssetPreload(urls: string[]): { loaded: number; total: number; ready: boolean } {
    const cache = useRef<HTMLImageElement[]>([]);
    const [loaded, setLoaded] = useState(0);

    // Join once so the effect does not re-run when the caller rebuilds the array.
    const key = urls.join('|');

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let cancelled = false;
        const list = key ? key.split('|') : [];
        cache.current = [];
        setLoaded(0);

        list.forEach(url => {
            const image = new Image();
            // Decoding off the main thread keeps the board interactive while
            // the rest of the artwork warms up in the background.
            image.decoding = 'async';
            image.src = url;
            cache.current.push(image);

            const done = () => {
                if (!cancelled) setLoaded(count => count + 1);
            };

            // decode() rejects for images that fail to load; either way the
            // asset is accounted for so the counter always reaches the total.
            if (typeof image.decode === 'function') {
                image.decode().then(done, done);
            } else {
                image.onload = done;
                image.onerror = done;
            }
        });

        return () => {
            cancelled = true;
        };
    }, [key]);

    const total = key ? key.split('|').length : 0;
    return { loaded, total, ready: total > 0 && loaded >= total };
}
