'use client';

import React from 'react';
import {
    BOARD_SIZES,
    boardSize,
    placedTileCount,
    refitTiles,
    resizeBoard,
    setTileCount,
    unlockedHexCount,
    type CustomBoardConfig,
} from '@/lib/catan/custom';
import { PORT_TYPES } from '@/lib/catan/ports';
import { TILE_TYPES } from '@/lib/catan/tiles';
import type { PortTypeId, TileTypeId } from '@/lib/catan/types';

export type EditMode = 'tiles' | 'ports' | null;

interface CustomBoardEditorProps {
    config: CustomBoardConfig;
    onChange: (next: CustomBoardConfig) => void;
    editMode: EditMode;
    onEditModeChange: (mode: EditMode) => void;
    /** Tile applied when a hex is clicked; `null` means unpin it. */
    brushTile: TileTypeId | null;
    onBrushTileChange: (tile: TileTypeId | null) => void;
    brushPort: PortTypeId;
    onBrushPortChange: (port: PortTypeId) => void;
    onAutoPlacePorts: () => void;
    onReset: () => void;
}

const LAND_TILES = Object.values(TILE_TYPES).filter(tile => tile.category === 'land');

/**
 * Controls for building a board by hand: how big it is, how many of each tile
 * go in the bag, which hexes are pinned, and where the harbours sit.
 */
export function CustomBoardEditor({
    config,
    onChange,
    editMode,
    onEditModeChange,
    brushTile,
    onBrushTileChange,
    brushPort,
    onBrushPortChange,
    onAutoPlacePorts,
    onReset,
}: CustomBoardEditorProps) {
    const size = boardSize(config.sizeIndex);
    const pinned = Object.keys(config.locked).length;
    const open = unlockedHexCount(config);
    const placed = placedTileCount(config);
    const spare = open - placed;

    const setCount = (tile: TileTypeId, value: number) =>
        onChange(setTileCount(config, tile, value));

    return (
        <div className="flex flex-col gap-3">
            {/* ---- board size ---- */}
            <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                    Board size — {size.label}, {size.hexCount} hexes
                </label>
                <input
                    type="range"
                    min={0}
                    max={BOARD_SIZES.length - 1}
                    value={config.sizeIndex}
                    // Resizing carries the tile mix with it, so the new board
                    // arrives full rather than mostly sea.
                    onChange={e => onChange(resizeBoard(config, Number(e.target.value)))}
                    className="w-full"
                />
                <div className="text-xs text-gray-500">
                    {size.rows.map(row => row.count).join('-')}
                </div>
            </div>

            {/* ---- tile mix ---- */}
            <div className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                    <label className="text-sm font-medium text-gray-700">Tiles</label>
                    <span
                        className={`text-xs text-right ${
                            spare < 0 ? 'text-red-600 font-semibold' : 'text-gray-500'
                        }`}
                    >
                        {spare < 0
                            ? `${-spare} too many for ${open} free hexes`
                            : `${spare} free ${spare === 1 ? 'hex' : 'hexes'} left as sea`}
                    </span>
                </div>

                {/* Pinning hexes changes how many are free, so offer a one-click
                    re-fit without having to nudge the size slider. */}
                {spare !== 0 && (
                    <button
                        onClick={() => onChange(refitTiles(config, open))}
                        className="self-start px-2 py-1 rounded text-xs font-semibold bg-gray-200 text-gray-900 hover:bg-gray-300"
                    >
                        Fit tiles to board
                    </button>
                )}

                {LAND_TILES.map(tile => (
                    <div key={tile.id} className="flex items-center gap-2">
                        <span className="flex-1 text-sm text-gray-700">{tile.label}</span>
                        <button
                            onClick={() => setCount(tile.id, (config.tileCounts[tile.id] || 0) - 1)}
                            className="w-7 h-7 rounded bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold"
                            aria-label={`One fewer ${tile.label}`}
                        >
                            −
                        </button>
                        <span className="w-6 text-center text-sm font-semibold text-gray-900">
                            {config.tileCounts[tile.id] || 0}
                        </span>
                        <button
                            onClick={() => setCount(tile.id, (config.tileCounts[tile.id] || 0) + 1)}
                            className="w-7 h-7 rounded bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold"
                            aria-label={`One more ${tile.label}`}
                        >
                            +
                        </button>
                    </div>
                ))}
            </div>

            {/* ---- editing tools ---- */}
            <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                    Edit board {pinned > 0 && <span className="text-gray-500">({pinned} pinned)</span>}
                </label>
                <div className="flex gap-2">
                    <ModeButton
                        label="Off"
                        active={editMode === null}
                        onClick={() => onEditModeChange(null)}
                    />
                    <ModeButton
                        label="Pin tiles"
                        active={editMode === 'tiles'}
                        onClick={() => onEditModeChange('tiles')}
                    />
                    <ModeButton
                        label="Harbours"
                        active={editMode === 'ports'}
                        onClick={() => onEditModeChange('ports')}
                    />
                </div>
            </div>

            {editMode === 'tiles' && (
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-600">
                        Click a hex to pin it. Pinned hexes keep their tile through every
                        reshuffle — use Sea to carve the board into islands.
                    </span>
                    <div className="flex flex-wrap gap-1">
                        {Object.values(TILE_TYPES).map(tile => (
                            <BrushButton
                                key={tile.id}
                                label={tile.id === 'water' ? 'Sea' : tile.label}
                                active={brushTile === tile.id}
                                onClick={() => onBrushTileChange(tile.id)}
                            />
                        ))}
                        <BrushButton
                            label="Unpin"
                            active={brushTile === null}
                            onClick={() => onBrushTileChange(null)}
                        />
                    </div>
                </div>
            )}

            {editMode === 'ports' && (
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-600">
                        Click a blue dot on the coast to add a harbour, or a red one to remove it.
                    </span>
                    <div className="flex flex-wrap gap-1">
                        {Object.values(PORT_TYPES).map(port => (
                            <BrushButton
                                key={port.id}
                                label={port.label}
                                active={brushPort === port.id}
                                onClick={() => onBrushPortChange(port.id)}
                            />
                        ))}
                    </div>
                    <button
                        onClick={onAutoPlacePorts}
                        className="mt-1 w-full px-3 py-2 rounded-lg text-sm font-semibold bg-gray-700 text-white hover:bg-gray-600"
                    >
                        Auto-place around the coast
                    </button>
                    <span className="text-xs text-gray-500">
                        {config.ports.length} harbour{config.ports.length === 1 ? '' : 's'}
                    </span>
                </div>
            )}

            <button
                onClick={onReset}
                className="w-full px-3 py-2 rounded-lg text-sm font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
            >
                Reset custom board
            </button>
        </div>
    );
}

function ModeButton({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 px-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
                active
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
            }`}
        >
            {label}
        </button>
    );
}

function BrushButton({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                active
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
            }`}
        >
            {label}
        </button>
    );
}
