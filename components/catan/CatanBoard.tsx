'use client';

import React, { useMemo } from 'react';
import { inchesToPixels } from '@/lib/dimensions';
import {
    deriveCoastSides,
    edgeAnchor,
    hexagonClipPath,
    hexagonPoints,
} from '@/lib/catan/hex-geometry';
import { getTileStyle } from '@/lib/catan/styles';
import { isWater } from '@/lib/catan/tiles';
import type { GeneratedBoard, Hex, HexSide, TileStyleId } from '@/lib/catan/types';
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

    // --- board editing (custom mode) ---
    /** What clicking does. 'tiles' pins hexes, 'ports' edits harbours. */
    editMode?: 'tiles' | 'ports' | null;
    /** Called with the 1-based hex index when a hex is clicked in 'tiles' mode. */
    onHexClick?: (hexNumber: number) => void;
    /** Called when a coast edge is clicked in 'ports' mode. */
    onCoastSideClick?: (side: { hex: number; side: HexSide }) => void;
    /** 1-based indices of hexes pinned by hand, shown with a marker. */
    lockedHexes?: Record<number, unknown>;
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
    editMode = null,
    onHexClick,
    onCoastSideClick,
    lockedHexes,
}: CatanBoardProps) {
    const style = getTileStyle(styleId);
    const { hexes, metrics, width, height, variant } = board;
    const display = variant.display ?? {};

    const waterHexes = useMemo(() => hexes.filter(hex => isWater(hex.tileType)), [hexes]);
    const landHexes = useMemo(() => hexes.filter(hex => !isWater(hex.tileType)), [hexes]);

    // Where a harbour could go: every side of the coast, including around
    // stray islands, so any of them can be clicked while editing ports.
    const coastSides = useMemo(
        () =>
            editMode === 'ports'
                ? deriveCoastSides(hexes, board.rows, metrics, hex => !isWater(hex.tileType)).flat()
                : [],
        [editMode, hexes, board.rows, metrics]
    );

    const occupiedSides = useMemo(
        () => new Set(board.ports.map(port => `${port.x.toFixed(1)},${port.y.toFixed(1)}`)),
        [board.ports]
    );

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
                    const hexNumber = hex.index + 1;
                    const pinned = Boolean(lockedHexes?.[hexNumber]);
                    return (
                        <HexTile
                            key={hex.id}
                            hex={hex}
                            metrics={metrics}
                            style={styleId}
                            renderMode={display.tileRender}
                        >
                            {editMode === 'tiles' && (
                                <div
                                    onClick={() => onHexClick?.(hexNumber)}
                                    title={`Hex ${hexNumber}`}
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        cursor: 'pointer',
                                        zIndex: 12,
                                        // A pinned hex keeps a visible tint so you can tell at a
                                        // glance which parts of the board are fixed.
                                        background: pinned ? 'rgba(65, 105, 225, 0.22)' : 'transparent',
                                        clipPath: `polygon(${hexagonClipPath(metrics)})`,
                                        boxSizing: 'border-box',
                                    }}
                                />
                            )}

                            {pinned && editMode === 'tiles' && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '8%',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        fontSize: `${metrics.width * 0.14}px`,
                                        lineHeight: 1,
                                        pointerEvents: 'none',
                                        zIndex: 13,
                                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))',
                                    }}
                                >
                                    📌
                                </div>
                            )}

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

                {/* Click targets along the coast, for adding and removing harbours. */}
                {editMode === 'ports' && (
                    <svg
                        style={{ ...svgLayer(25), pointerEvents: 'none' }}
                        viewBox={`0 0 ${width} ${height}`}
                    >
                        {coastSides.map(side => {
                            const anchor = edgeAnchor(side.from, side.to);
                            const taken = occupiedSides.has(
                                `${anchor.x.toFixed(1)},${anchor.y.toFixed(1)}`
                            );
                            return (
                                <circle
                                    key={`${side.hex}-${side.side}`}
                                    cx={anchor.x}
                                    cy={anchor.y}
                                    r={metrics.width * 0.11}
                                    fill={taken ? 'rgba(211, 47, 47, 0.75)' : 'rgba(255,255,255,0.55)'}
                                    stroke={taken ? '#ffffff' : '#4169e1'}
                                    strokeWidth={3}
                                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                                    onClick={() =>
                                        onCoastSideClick?.({ hex: side.hex, side: side.side })
                                    }
                                >
                                    <title>
                                        {taken ? 'Remove this harbour' : 'Place a harbour here'}
                                    </title>
                                </circle>
                            );
                        })}
                    </svg>
                )}

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
