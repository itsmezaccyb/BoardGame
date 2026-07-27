'use client';

import React from 'react';
import { hexagonClipPath } from '@/lib/catan/hex-geometry';
import { getTileImage } from '@/lib/catan/tiles';
import type { Hex, HexMetrics, TileRenderMode, TileStyleId } from '@/lib/catan/types';

interface HexTileProps {
    hex: Hex;
    metrics: HexMetrics;
    style: TileStyleId;
    /** 'cover' fits the artwork to the hex; 'rotated' turns it a quarter-turn first. */
    renderMode?: TileRenderMode;
    children?: React.ReactNode;
}

/**
 * A single hex: its artwork, clipped to the hexagon, plus whatever is layered
 * on top (usually a number token).
 */
export function HexTile({ hex, metrics, style, renderMode = 'cover', children }: HexTileProps) {
    const image = getTileImage(hex.tileType, style);
    const clipPath = `polygon(${hexagonClipPath(metrics)})`;

    return (
        <div
            style={{
                position: 'absolute',
                left: `${hex.x}px`,
                top: `${hex.y}px`,
                width: `${metrics.width}px`,
                height: `${metrics.height}px`,
                overflow: 'visible',
                zIndex: 2,
            }}
        >
            {renderMode === 'rotated' ? (
                <RotatedFill image={image} metrics={metrics} clipPath={clipPath} />
            ) : (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: image ? `url(${image})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        clipPath,
                    }}
                />
            )}
            {children}
        </div>
    );
}

/**
 * Artwork drawn a quarter-turn round. The inner square is oversized by √2 so
 * the rotated image still covers every corner of the hex.
 */
function RotatedFill({
    image,
    metrics,
    clipPath,
}: {
    image: string | null;
    metrics: HexMetrics;
    clipPath: string;
}) {
    const size = Math.max(metrics.width, metrics.height) * Math.SQRT2;

    return (
        <div style={{ position: 'absolute', inset: 0, clipPath, overflow: 'hidden' }}>
            <div
                style={{
                    position: 'absolute',
                    width: `${size}px`,
                    height: `${size}px`,
                    left: `${(metrics.width - size) / 2}px`,
                    top: `${(metrics.height - size) / 2}px`,
                    backgroundImage: image ? `url(${image})` : 'none',
                    backgroundSize: `${size}px ${size}px`,
                    backgroundPosition: 'center',
                    transform: 'rotate(-90deg)',
                    transformOrigin: 'center',
                }}
            />
        </div>
    );
}
