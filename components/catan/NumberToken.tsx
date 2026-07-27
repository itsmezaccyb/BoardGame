'use client';

import React from 'react';
import { getDotCount, isHighProbability } from '@/lib/catan/numbers';

interface NumberTokenProps {
    value: number;
    /** Diameter is derived from the hex width so tokens scale with the board. */
    hexWidth: number;
    selected?: boolean;
    /** Counter-rotation keeping the token upright on a rotated board. */
    rotationDeg?: number;
    onClick?: () => void;
}

/** The round dice-number chit, with probability pips underneath. */
export function NumberToken({
    value,
    hexWidth,
    selected = false,
    rotationDeg = 0,
    onClick,
}: NumberTokenProps) {
    const size = hexWidth * 0.35;
    const transform = `translate(-50%, -50%)${rotationDeg ? ` rotate(${rotationDeg}deg)` : ''}`;

    return (
        <div
            onClick={onClick}
            style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform,
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: selected ? '#87ceeb' : '#f5f5dc',
                borderRadius: '50%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: selected ? '3px solid #4169e1' : 'none',
                zIndex: 10,
                boxShadow: selected
                    ? '0 0 12px rgba(65, 105, 225, 0.6)'
                    : '0 2px 4px rgba(0,0,0,0.3)',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
            }}
        >
            <span
                style={{
                    fontSize: `${hexWidth * 0.18}px`,
                    fontWeight: 'bold',
                    color: isHighProbability(value) ? '#d32f2f' : '#000',
                    fontFamily: 'Arial, sans-serif',
                    lineHeight: 1,
                }}
            >
                {value}
            </span>
            <div
                style={{
                    display: 'flex',
                    gap: '2px',
                    marginTop: '2px',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                {Array.from({ length: getDotCount(value) }).map((_, i) => (
                    <div
                        key={i}
                        style={{
                            width: '3px',
                            height: '3px',
                            borderRadius: '50%',
                            backgroundColor: '#000',
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
