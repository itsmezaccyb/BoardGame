'use client';

import React from 'react';
import { listTileStyles } from '@/lib/catan/styles';
import { listScenarios, listVariants } from '@/lib/catan/variants';
import type { ExpansionId, PlayerCount, ScenarioId, TileStyleId } from '@/lib/catan/types';

interface CatanSettingsProps {
    expansion: ExpansionId;
    scenario: ScenarioId | undefined;
    onScenarioChange: (scenario: ScenarioId) => void;
    playerCount: PlayerCount;
    onPlayerCountChange: (playerCount: PlayerCount) => void;
    tileStyle: TileStyleId;
    onTileStyleChange: (style: TileStyleId) => void;
    citiesAndKnights: boolean;
    onCitiesAndKnightsChange: (enabled: boolean) => void;
    onRandomize: () => void;
}

/**
 * Catan's settings controls.
 *
 * Scenarios, player counts and styles are all read from the registries, so a
 * new game mode shows up here without this file changing.
 */
export function CatanSettings({
    expansion,
    scenario,
    onScenarioChange,
    playerCount,
    onPlayerCountChange,
    tileStyle,
    onTileStyleChange,
    citiesAndKnights,
    onCitiesAndKnightsChange,
    onRandomize,
}: CatanSettingsProps) {
    const scenarios = listScenarios(expansion);
    const variants = listVariants(expansion, scenario);
    const styles = listTileStyles();

    return (
        <>
            <button
                onClick={onRandomize}
                className="w-full px-6 py-3 rounded-lg font-semibold text-lg transition-colors bg-gray-700 text-white hover:bg-gray-600 text-left"
            >
                Randomize
            </button>

            <div className="flex items-center gap-2 px-2 py-2">
                <input
                    type="checkbox"
                    id="cities-and-knights"
                    checked={citiesAndKnights}
                    onChange={(e) => onCitiesAndKnightsChange(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="cities-and-knights" className="text-sm font-medium text-gray-700">
                    Cities &amp; Knights
                </label>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 px-2">Style</label>
                <div className="flex gap-2">
                    {styles.map((style) => (
                        <button
                            key={style.id}
                            onClick={() => onTileStyleChange(style.id)}
                            className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                                tileStyle === style.id
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                            }`}
                        >
                            {style.label}
                        </button>
                    ))}
                </div>
            </div>

            {scenarios.length > 0 && (
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">Scenario</label>
                    <select
                        value={scenario ?? scenarios[0].id}
                        onChange={(e) => onScenarioChange(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {scenarios.map((option) => (
                            <option key={option.id} value={option.id}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {variants.map((variant) => (
                <button
                    key={variant.id}
                    onClick={() => onPlayerCountChange(variant.playerCount)}
                    className={`w-full px-6 py-3 rounded-lg font-semibold text-lg transition-colors text-left ${
                        playerCount === variant.playerCount
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                    }`}
                >
                    {variant.label}
                </button>
            ))}
        </>
    );
}
