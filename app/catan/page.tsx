'use client';

import { useEffect, useMemo, useState } from 'react';
import { BuildingCostsLegend } from '@/components/BuildingCostsLegend';
import { GameSettingsPanel } from '@/components/GameSettingsPanel';
import { CatanBoard } from '@/components/catan/CatanBoard';
import { CatanSettings } from '@/components/catan/CatanSettings';
import { useAssetPreload } from '@/components/catan/useAssetPreload';
import { assetUrl } from '@/lib/asset-url';
import { catanImageUrls } from '@/lib/catan/assets';
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

    // Warm every tile, boat and icon once, so changing style or expansion
    // later never waits on the network.
    useAssetPreload(useMemo(() => catanImageUrls(), []));

    const metrics = useMemo(() => createHexMetrics(), []);
    const variant = useMemo(
        () => resolveVariant({ expansion, scenario, playerCount }),
        [expansion, scenario, playerCount]
    );
    const board = useMemo(() => generateBoard(variant, seed, metrics), [variant, seed, metrics]);

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
        if (variant.playerCount !== playerCount) setPlayerCount(variant.playerCount);
    }, [variant, playerCount]);

    // A different board shape deserves a fresh shuffle.
    useEffect(() => {
        setSeed(Math.random() * 10000);
    }, [variant.id]);

    useEffect(() => {
        setNumberSwaps(new Map());
        setSelectedHexId(null);
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
                />
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
