'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BuildingCostsLegend } from '@/components/BuildingCostsLegend';
import { GameSettingsPanel } from '@/components/GameSettingsPanel';
import { CatanBoard } from '@/components/catan/CatanBoard';
import { CatanSettings } from '@/components/catan/CatanSettings';
import { CustomBoardEditor, type EditMode } from '@/components/catan/CustomBoardEditor';
import { useAssetPreload } from '@/components/catan/useAssetPreload';
import { assetUrl } from '@/lib/asset-url';
import { catanImageUrls } from '@/lib/catan/assets';
import {
    autoPlacePorts,
    buildCustomVariant,
    coastSidesFor,
    CUSTOM_EXPANSION,
    DEFAULT_CUSTOM_CONFIG,
    normalizeConfig,
    suggestedPortCount,
    type CustomBoardConfig,
} from '@/lib/catan/custom';
import type { PortTypeId, TileTypeId } from '@/lib/catan/types';
import { generateBoard } from '@/lib/catan/generator';
import { createHexMetrics } from '@/lib/catan/hex-geometry';
import { DEFAULT_TILE_STYLE, getTileStyle } from '@/lib/catan/styles';
import {
    DEFAULT_EXPANSION,
    listExpansions,
    listScenarios,
    resolveVariant,
} from '@/lib/catan/variants';
import type { ExpansionId, Hex, PlayerCount, ScenarioId, TileStyleId } from '@/lib/catan/types';

/**
 * Catan board generator.
 *
 * This page only holds the player's selections; which boards exist and how
 * they are built lives in `lib/catan` (see `lib/catan/index.ts` for a map).
 */
export default function CatanPage() {
    const [expansion, setExpansion] = useState<ExpansionId>(DEFAULT_EXPANSION);
    const [scenario, setScenario] = useState<ScenarioId | undefined>(undefined);
    const [playerCount, setPlayerCount] = useState<PlayerCount>(4);
    const [tileStyle, setTileStyle] = useState<TileStyleId>(DEFAULT_TILE_STYLE);
    const [citiesAndKnights, setCitiesAndKnights] = useState(false);
    const [seed, setSeed] = useState(0);

    // Number tokens the player has picked up and swapped by hand.
    const [selectedHexId, setSelectedHexId] = useState<string | null>(null);
    const [numberSwaps, setNumberSwaps] = useState<Map<string, number>>(new Map());

    // Face-down hexes the player has turned over.
    const [revealed, setRevealed] = useState<Set<string>>(new Set());

    // Custom board building.
    const [custom, setCustom] = useState<CustomBoardConfig>(DEFAULT_CUSTOM_CONFIG);
    const [editMode, setEditMode] = useState<EditMode>(null);
    const [brushTile, setBrushTile] = useState<TileTypeId | null>('water');
    const [brushPort, setBrushPort] = useState<PortTypeId>('generic_3-1');
    const isCustom = expansion === CUSTOM_EXPANSION;

    // Warm every tile, boat and icon once, so changing style or expansion
    // later never waits on the network.
    useAssetPreload(useMemo(() => catanImageUrls(), []));

    const metrics = useMemo(() => createHexMetrics(), []);
    const variant = useMemo(
        () =>
            isCustom
                ? buildCustomVariant(custom)
                : resolveVariant({ expansion, scenario, playerCount }),
        [isCustom, custom, expansion, scenario, playerCount]
    );
    const board = useMemo(() => generateBoard(variant, seed, metrics), [variant, seed, metrics]);

    // --- custom board persistence -------------------------------------------

    const BOARD_KEY = 'catan:custom-board';
    const SETTINGS_KEY = 'catan:settings';

    // Set on a first-ever visit, so the starter board arrives with harbours
    // instead of a bare coastline. Never fires again once a board is saved.
    const needsStarterPorts = useRef(false);

    // Saving is gated on the restore having happened. Without this the save
    // effect fires on the first render and writes the defaults straight over
    // whatever was stored, before the restored values land in state.
    const [restored, setRestored] = useState(false);

    useEffect(() => {
        try {
            const savedBoard = window.localStorage.getItem(BOARD_KEY);
            if (savedBoard) setCustom(normalizeConfig(JSON.parse(savedBoard)));
            else needsStarterPorts.current = true;

            const savedSettings = window.localStorage.getItem(SETTINGS_KEY);
            if (savedSettings) {
                const saved = JSON.parse(savedSettings);
                if (saved.expansion) setExpansion(saved.expansion);
                if (saved.scenario !== undefined) setScenario(saved.scenario);
                if (saved.playerCount !== undefined) setPlayerCount(saved.playerCount);
                if (saved.tileStyle) setTileStyle(saved.tileStyle);
                if (typeof saved.citiesAndKnights === 'boolean') {
                    setCitiesAndKnights(saved.citiesAndKnights);
                }
            }
        } catch {
            // A corrupt or unavailable store just means starting from defaults.
            needsStarterPorts.current = true;
        }
        setRestored(true);
    }, []);

    useEffect(() => {
        if (!restored) return;
        try {
            window.localStorage.setItem(BOARD_KEY, JSON.stringify(custom));
        } catch {
            // Private browsing or a full quota; the board still works in memory.
        }
    }, [restored, custom]);

    // Coming back to the same setup after a reload matters most on a kiosk,
    // where the Pi may reboot between games.
    useEffect(() => {
        if (!restored) return;
        try {
            window.localStorage.setItem(
                SETTINGS_KEY,
                JSON.stringify({ expansion, scenario, playerCount, tileStyle, citiesAndKnights })
            );
        } catch {
            // Same as above — not being able to save is not worth interrupting play.
        }
    }, [restored, expansion, scenario, playerCount, tileStyle, citiesAndKnights]);

    // Leaving the custom board puts the editing overlays away.
    useEffect(() => {
        if (!isCustom) setEditMode(null);
    }, [isCustom]);

    /** Pin or unpin a hex to whatever the palette has selected. */
    const handleHexClick = (hexNumber: number) => {
        setCustom(previous => {
            const locked = { ...previous.locked };
            if (brushTile === null || locked[hexNumber] === brushTile) delete locked[hexNumber];
            else locked[hexNumber] = brushTile;
            return { ...previous, locked };
        });
    };

    /** Add a harbour to a coast edge, or clear the one already there. */
    const handleCoastSideClick = ({ hex, side }: { hex: number; side: string }) => {
        setCustom(previous => {
            const existing = previous.ports.findIndex(
                port => port.hex === hex && port.side === side
            );
            if (existing >= 0) {
                return {
                    ...previous,
                    ports: previous.ports.filter((_, i) => i !== existing),
                };
            }
            return {
                ...previous,
                ports: [...previous.ports, { hex, side: side as never, portType: brushPort }],
            };
        });
    };

    const handleAutoPlacePorts = useCallback(() => {
        const coast = coastSidesFor(board.hexes, board.rows, metrics);
        const longest = coast.reduce((a, b) => (b.length > a.length ? b : a), []);
        setCustom(previous => ({
            ...previous,
            ports: autoPlacePorts(
                board.hexes,
                board.rows,
                metrics,
                suggestedPortCount(longest.length)
            ),
        }));
    }, [board.hexes, board.rows, metrics]);

    useEffect(() => {
        if (!isCustom || !needsStarterPorts.current || custom.ports.length) return;
        needsStarterPorts.current = false;
        handleAutoPlacePorts();
    }, [isCustom, custom.ports.length, handleAutoPlacePorts]);

    // Keep the selection honest when a mode does not offer the current choice.
    useEffect(() => {
        const scenarios = listScenarios(expansion);
        if (scenarios.length > 0 && !scenarios.some(s => s.id === scenario)) {
            setScenario(scenarios[0].id);
        } else if (scenarios.length === 0 && scenario !== undefined) {
            setScenario(undefined);
        }
    }, [expansion, scenario]);

    useEffect(() => {
        // The custom board has no player count, so leave the last real one
        // alone — it is what we fall back to on the way out.
        if (isCustom) return;
        if (variant.playerCount !== playerCount) setPlayerCount(variant.playerCount);
    }, [isCustom, variant, playerCount]);

    // A different board shape deserves a fresh shuffle.
    useEffect(() => {
        setSeed(Math.random() * 10000);
    }, [variant.id]);

    useEffect(() => {
        setNumberSwaps(new Map());
        setSelectedHexId(null);
        setRevealed(new Set());
    }, [variant.id, seed]);

    /** Tap two tokens to trade their numbers. */
    const handleNumberTokenClick = (hex: Hex) => {
        const current = numberSwaps.get(hex.id) ?? hex.number;
        if (current === undefined) return;

        if (selectedHexId === null) {
            setSelectedHexId(hex.id);
            return;
        }

        if (selectedHexId === hex.id) {
            setSelectedHexId(null);
            return;
        }

        const other = board.hexes.find(h => h.id === selectedHexId);
        const otherValue = other && (numberSwaps.get(other.id) ?? other.number);

        if (other && otherValue !== undefined) {
            const swaps = new Map(numberSwaps);
            swaps.set(other.id, current);
            swaps.set(hex.id, otherValue);
            setNumberSwaps(swaps);
        }

        setSelectedHexId(null);
    };

    const style = getTileStyle(tileStyle);
    const expansionOptions = listExpansions().map(exp => ({ value: exp.id, label: exp.label }));

    return (
        <main
            className="h-screen w-screen flex flex-col items-center justify-center overflow-hidden"
            style={{
                backgroundImage: `url(${assetUrl(style.background)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >
            <CatanBoard
                board={board}
                styleId={tileStyle}
                showBarbarianTrack={citiesAndKnights}
                selectedHexId={selectedHexId}
                onNumberTokenClick={handleNumberTokenClick}
                numberOverrides={numberSwaps}
                editMode={isCustom ? editMode : null}
                onHexClick={handleHexClick}
                onCoastSideClick={handleCoastSideClick}
                lockedHexes={custom.locked}
                revealedHexes={revealed}
                onRevealHex={hex => setRevealed(prev => new Set(prev).add(hex.id))}
            />

            <GameSettingsPanel
                expansion={expansion}
                onExpansionChange={setExpansion}
                expansionOptions={expansionOptions}
            >
                <CatanSettings
                    expansion={expansion}
                    scenario={scenario}
                    onScenarioChange={setScenario}
                    playerCount={playerCount}
                    onPlayerCountChange={setPlayerCount}
                    tileStyle={tileStyle}
                    onTileStyleChange={setTileStyle}
                    citiesAndKnights={citiesAndKnights}
                    onCitiesAndKnightsChange={setCitiesAndKnights}
                    onRandomize={() => setSeed(Math.random() * 10000)}
                >
                    {isCustom ? (
                        <CustomBoardEditor
                            config={custom}
                            onChange={setCustom}
                            editMode={editMode}
                            onEditModeChange={setEditMode}
                            brushTile={brushTile}
                            onBrushTileChange={setBrushTile}
                            brushPort={brushPort}
                            onBrushPortChange={setBrushPort}
                            onAutoPlacePorts={handleAutoPlacePorts}
                            onReset={() => setCustom(DEFAULT_CUSTOM_CONFIG)}
                        />
                    ) : undefined}
                </CatanSettings>
            </GameSettingsPanel>

            {/* Building costs, readable from either side of the table. */}
            <div style={{ position: 'fixed', bottom: '20px', left: '20px', zIndex: 30 }}>
                <div style={{ transform: 'scale(1.6)', transformOrigin: 'bottom left' }}>
                    <BuildingCostsLegend
                        expansion={expansion}
                        citiesAndKnights={citiesAndKnights}
                        position="bottom-left"
                        tileStyle={tileStyle}
                    />
                </div>
            </div>

            <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 30 }}>
                <div style={{ transform: 'scale(1.6)', transformOrigin: 'top right' }}>
                    <BuildingCostsLegend
                        expansion={expansion}
                        citiesAndKnights={citiesAndKnights}
                        position="top-right"
                        tileStyle={tileStyle}
                    />
                </div>
            </div>
        </main>
    );
}
