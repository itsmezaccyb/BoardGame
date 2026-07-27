'use client';

import React from 'react';
import type { TileStyle } from '@/lib/catan/styles';
import type { RenderedOutline } from '@/lib/catan/types';

interface BoardOutlineProps {
    outline: RenderedOutline;
    style: TileStyle;
    boardWidth: number;
    boardHeight: number;
}

/** Overhang around the board so blurred strokes are not clipped. */
const BLEED = 500;

/**
 * Draws a coastline as a closed loop.
 *
 * Each style defines its own stack of stroke passes per outline weight — a
 * faint hairline under a soft glow for the classic look, a single flat stroke
 * for the simple one.
 */
export function BoardOutline({ outline, style, boardWidth, boardHeight }: BoardOutlineProps) {
    const layers = style.outlines[outline.weight];
    const loops = outline.loops.filter(loop => loop.length >= 2);
    if (!layers?.length || loops.length === 0) return null;

    return (
        <svg
            style={{
                position: 'absolute',
                inset: `-${BLEED}px`,
                width: `calc(${boardWidth}px + ${BLEED * 2}px)`,
                height: `calc(${boardHeight}px + ${BLEED * 2}px)`,
                pointerEvents: 'none',
                zIndex: 10,
            }}
            viewBox={`-${BLEED} -${BLEED} ${boardWidth + BLEED * 2} ${boardHeight + BLEED * 2}`}
        >
            <defs>
                {layers.map((layer, idx) =>
                    layer.blurStdDeviation ? (
                        <filter
                            key={`filter-${idx}`}
                            id={`outline-blur-${outline.id}-${idx}`}
                            x="-50%"
                            y="-50%"
                            width="200%"
                            height="200%"
                            filterUnits="objectBoundingBox"
                        >
                            <feGaussianBlur in="SourceGraphic" stdDeviation={layer.blurStdDeviation} />
                        </filter>
                    ) : null
                )}
            </defs>

            {layers.map((layer, idx) => (
                <g
                    key={`layer-${idx}`}
                    filter={
                        layer.blurStdDeviation
                            ? `url(#outline-blur-${outline.id}-${idx})`
                            : undefined
                    }
                >
                    {loops.map((loop, loopIdx) => (
                        <polygon
                            key={loopIdx}
                            points={loop.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke={layer.stroke}
                            strokeWidth={layer.width}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={layer.opacity}
                        />
                    ))}
                </g>
            ))}
        </svg>
    );
}
