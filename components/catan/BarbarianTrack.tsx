'use client';

import React from 'react';

interface BarbarianTrackProps {
    /** 'below' stacks the track under the board; 'left' runs it down the side. */
    orientation: 'left' | 'below';
    /** Pixel position of the track's leading edge. */
    offset: number;
    /** CSS `top` value used by the 'left' orientation. */
    topOffset?: string;
    /** How many steps before the barbarians land. */
    steps?: number;
}

/**
 * Cities & Knights barbarian track — a ring of numbered steps counting down to
 * the attack, with a filled marker at the end.
 */
export function BarbarianTrack({
    orientation,
    offset,
    topOffset = '50%',
    steps = 8,
}: BarbarianTrackProps) {
    const below = orientation === 'below';

    return (
        <div
            style={{
                position: 'absolute',
                display: 'grid',
                gridTemplateColumns: below ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
                gap: '12px',
                zIndex: 10,
                ...(below
                    ? { left: '50%', top: `${offset}px`, transform: 'translateX(-50%)' }
                    : { left: `${offset}px`, top: topOffset, transform: 'translateY(-50%)' }),
            }}
        >
            {Array.from({ length: steps }).map((_, index) => {
                const isAttack = index === steps - 1;
                return (
                    <div
                        key={`barbarian-${index}`}
                        style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            border: '2px solid #ffffff',
                            backgroundColor: isAttack ? '#ffffff' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px',
                            fontWeight: 'bold',
                            color: '#ffffff',
                        }}
                    >
                        {isAttack ? '' : index + 1}
                    </div>
                );
            })}
        </div>
    );
}
