'use client';

import React from 'react';
import { getPortArt, getPortLogo, getPortLogoScale, getPortType } from '@/lib/catan/ports';
import type { TileStyle } from '@/lib/catan/styles';
import type { PortPlacement } from '@/lib/catan/types';

interface PortBoatProps {
    placement: PortPlacement;
    style: TileStyle;
    hexWidth: number;
}

/**
 * A harbour boat moored against a board edge.
 *
 * Styles draw these one of two ways (see `styles.ts`): 'art' uses a bespoke
 * boat image per port type, 'overlay' stamps a resource icon onto a shared boat.
 */
export function PortBoat({ placement, style, hexWidth }: PortBoatProps) {
    const port = getPortType(placement.portType);
    if (!port) return null;

    const size = hexWidth * style.port.sizeFactor;
    const boat =
        style.port.mode === 'overlay'
            ? style.port.baseImage
            : getPortArt(placement.portType, style.id);

    if (!boat) return null;

    const logo = style.port.mode === 'overlay' ? getPortLogo(placement.portType, style.id) : null;
    const logoSize = `${getPortLogoScale(placement.portType) * 100}%`;

    return (
        <div
            style={{
                position: 'absolute',
                left: `${placement.x - size / 2}px`,
                top: `${placement.y - size / 2}px`,
                width: `${size}px`,
                height: `${size}px`,
                transform: `rotate(${placement.angle}deg)`,
                transformOrigin: 'center',
            }}
        >
            <img
                src={boat}
                alt={`${port.label} port`}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    pointerEvents: 'none',
                }}
            />
            {logo && (
                <img
                    src={logo}
                    alt={port.label}
                    style={{
                        position: 'absolute',
                        top: style.port.logoPosition?.top ?? '50%',
                        left: style.port.logoPosition?.left ?? '50%',
                        transform: 'translate(-50%, -50%)',
                        width: logoSize,
                        height: logoSize,
                        objectFit: 'contain',
                        pointerEvents: 'none',
                    }}
                />
            )}
        </div>
    );
}
