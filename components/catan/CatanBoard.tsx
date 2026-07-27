'use client';

import React, { useMemo } from 'react';
import { inchesToPixels } from '@/lib/dimensions';
import { hexagonPoints } from '@/lib/catan/hex-geometry';
import { getTileStyle } from '@/lib/catan/styles';
import { isWater } from '@/lib/catan/tiles';
import type { GeneratedBoard, Hex, TileStyleId } from '@/lib/catan/types';
import { BarbarianTrack } from './BarbarianTrack';
import { BoardOutline } from './BoardOutline';
import { HexTile } from './HexTile';
import { NumberToken } from './NumberToken';
import { PortBoat } from './PortBoat';

interface CatanBoardProps {
    board: GeneratedBoard;
    styleId: TileStyleId;
    /** Show the Cities & Knights barbarian track alongside the board. */
    showBarbarianTrack?: boolean;
    /** Number token the player has picked up, ready to swap. */
    selectedHexId?: string | null;
    onNumberTokenClick?: (hex: Hex) => void;
    /** Overrides for tokens the player has swapped, keyed by hex id. */
    numberOverrides?: Map<string, number>;
}

/**
 * Renders a generated board.
 *
 * This component knows nothing about specific game modes: everything it needs
 * — coastlines, ports, artwork, rotation — arrives on `board.variant` and the
 * tile style, so a new scenario renders without touching this file.
 */
export function CatanBoard({
    board,
    styleId,
    showBarbarianTrack = false,
    selectedHexId = null,
    onNumberTokenClick,
    numberOverrides,
}: CatanBoardProps) {
    const style = getTileStyle(styleId);
    const { hexes, metrics, width, height, variant } = board;
    const display = variant.display ?? {};

    const waterHexes = useMemo(() => hexes.filter(hex => isWater(hex.tileType)), [hexes]);
    const landHexes = useMemo(() => hexes.filter(hex => !isWater(hex.tileType)), [hexes]);

    const barbarianOffset = useMemo(() => {
        if (!showBarbarianTrack || hexes.length === 0) return 0;
        return display.barbarianTrack?.orientation === 'below'
            ? Math.max(...hexes.map(hex => hex.y + metrics.height)) + 100
            : Math.min(...hexes.map(hex => hex.x)) - 300;
    }, [showBarbarianTrack, hexes, metrics.height, display.barbarianTrack?.orientation]);

    const svgLayer = (zIndex: number): React.CSSProperties => ({
        position: 'absolute',
        inset: 0,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'none',
        zIndex,
    });

    return (
        <div
            style={{
                position: 'relative',
                width: `${width}px`,
                height: `${height}px`,
                marginBottom: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                maxWidth: '95vw',
                maxHeight: '80vh',
                marginLeft: 'auto',
                marginRight: 'auto',
            }}
        >
            <div
                style={{
                    position: 'relative',
                    width: `${width}px`,
                    height: `${height}px`,
                    transform: display.rotateDeg ? `rotate(${display.rotateDeg}deg)` : undefined,
                    transformOrigin: 'center',
                    margin: '0 auto',
                    marginTop: display.marginTopInches
                        ? `${inchesToPixels(display.marginTopInches)}px`
                        : undefined,
                }}
            >
                {board.outlines.map(outline => (
                    <BoardOutline
                        key={outline.id}
                        outline={outline}
                        style={style}
                        boardWidth={width}
                        boardHeight={height}
                    />
                ))}

                {board.ports.length > 0 && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
                        {board.ports.map((placement, idx) => (
                            <PortBoat
                                key={`port-${idx}`}
                                placement={placement}
                                style={style}
                                hexWidth={metrics.width}
                            />
                        ))}
                    </div>
                )}

                {/* Thin outline on every sea hex, under the tiles. */}
                <svg style={svgLayer(1)} viewBox={`0 0 ${width} ${height}`}>
                    {waterHexes.map(hex => (
                        <polygon
                            key={`water-border-${hex.id}`}
                            points={hexagonPoints(
                                hex.x + metrics.width / 2,
                                hex.y + metrics.height / 2,
                                metrics
                            )}
                            fill="none"
                            stroke={style.waterBorder.stroke}
                            strokeWidth={style.waterBorder.width}
                        />
                    ))}
                </svg>

                {showBarbarianTrack && (
                    <BarbarianTrack
                        orientation={display.barbarianTrack?.orientation ?? 'left'}
                        offset={barbarianOffset}
                        topOffset={display.barbarianTrack?.topOffset}
                    />
                )}

                {hexes.map(hex => {
                    const value = numberOverrides?.get(hex.id) ?? hex.number;
                    return (
                        <HexTile
                            key={hex.id}
                            hex={hex}
                            metrics={metrics}
                            style={styleId}
                            renderMode={display.tileRender}
                        >
                            {hex.number !== undefined && value !== undefined && (
                                <NumberToken
                                    value={value}
                                    hexWidth={metrics.width}
                                    selected={selectedHexId === hex.id}
                                    rotationDeg={display.numberTokenRotationDeg}
                                    onClick={
                                        onNumberTokenClick ? () => onNumberTokenClick(hex) : undefined
                                    }
                                />
                            )}
                        </HexTile>
                    );
                })}

                {/* Land borders sit above the tiles so neighbours share a seam. */}
                <svg style={svgLayer(20)} viewBox={`0 0 ${width} ${height}`}>
                    {style.tileBorder.blurStdDeviation && (
                        <defs>
                            <filter id="tile-border-fade" x="-10%" y="-10%" width="120%" height="120%">
                                <feGaussianBlur
                                    in="SourceGraphic"
                                    stdDeviation={style.tileBorder.blurStdDeviation}
                                />
                            </filter>
                        </defs>
                    )}
                    {landHexes.map(hex => (
                        <polygon
                            key={`border-${hex.id}`}
                            points={hexagonPoints(
                                hex.x + metrics.width / 2,
                                hex.y + metrics.height / 2,
                                metrics
                            )}
                            fill="none"
                            stroke={style.tileBorder.stroke}
                            strokeWidth={style.tileBorder.width}
                            filter={
                                style.tileBorder.blurStdDeviation ? 'url(#tile-border-fade)' : undefined
                            }
                        />
                    ))}
                </svg>
            </div>
        </div>
    );
}
