import { CUSTOM_EXPANSION, CUSTOM_VARIANT_TEMPLATE } from '../custom';
import type { BoardVariant, ExpansionId, PlayerCount, ScenarioId } from '../types';
import { CLASSIC_VARIANTS } from './classic';
import { FOUR_ISLANDS_VARIANTS } from './seafarers-four-islands';
import { NEW_SHORES_VARIANTS } from './seafarers-new-shores';

/**
 * Variant registry — the single list of playable boards.
 *
 * ---------------------------------------------------------------------------
 * TO ADD A GAME MODE
 * ---------------------------------------------------------------------------
 * 1. Create a file next to this one exporting one `BoardVariant` per player
 *    count (see `classic.ts` for the simplest example).
 * 2. Add those variants to `BOARD_VARIANTS` below.
 * 3. If it belongs to a new expansion or scenario, add a label to `EXPANSIONS`
 *    or `SCENARIOS`.
 *
 * The settings panel is built from this registry, so the new mode appears in
 * the UI with no further changes.
 */

export interface ExpansionDef {
    id: ExpansionId;
    label: string;
}

export interface ScenarioDef {
    id: ScenarioId;
    expansion: ExpansionId;
    label: string;
}

export const EXPANSIONS: ExpansionDef[] = [
    { id: 'classic', label: 'Classic' },
    { id: 'seafarers', label: 'Seafarers' },
    { id: CUSTOM_EXPANSION, label: 'Custom Board' },
];

export const SCENARIOS: ScenarioDef[] = [
    { id: 'heading-for-new-shores', expansion: 'seafarers', label: 'Heading for New Shores' },
    { id: '4-islands', expansion: 'seafarers', label: '4 Islands' },
];

export const BOARD_VARIANTS: BoardVariant[] = [
    ...CLASSIC_VARIANTS,
    ...NEW_SHORES_VARIANTS,
    ...FOUR_ISLANDS_VARIANTS,
    // A stand-in so the mode is listed; the page swaps in a variant built from
    // the player's own settings (see `lib/catan/custom.ts`).
    CUSTOM_VARIANT_TEMPLATE,
];

export const DEFAULT_EXPANSION: ExpansionId = 'classic';

export function listExpansions(): ExpansionDef[] {
    return EXPANSIONS.filter(exp => BOARD_VARIANTS.some(v => v.expansion === exp.id));
}

/** Scenarios available inside an expansion; empty when it has only one board family. */
export function listScenarios(expansion: ExpansionId): ScenarioDef[] {
    return SCENARIOS.filter(
        scenario =>
            scenario.expansion === expansion &&
            BOARD_VARIANTS.some(v => v.expansion === expansion && v.scenario === scenario.id)
    );
}

export function listVariants(expansion: ExpansionId, scenario?: ScenarioId): BoardVariant[] {
    const scenarios = listScenarios(expansion);
    // An expansion with no scenarios ignores the scenario filter entirely.
    const wanted = scenarios.length === 0 ? undefined : scenario ?? scenarios[0].id;
    return BOARD_VARIANTS.filter(
        v => v.expansion === expansion && (wanted === undefined || v.scenario === wanted)
    );
}

/** Player counts offered for an expansion/scenario, in registration order. */
export function listPlayerCounts(expansion: ExpansionId, scenario?: ScenarioId): PlayerCount[] {
    return listVariants(expansion, scenario).map(v => v.playerCount);
}

export function findVariant(id: string): BoardVariant | undefined {
    return BOARD_VARIANTS.find(v => v.id === id);
}

/**
 * Picks the best matching board for the current settings.
 *
 * Settings can go momentarily out of sync — switching to an expansion that has
 * no 5-6 player board, say — so this falls back rather than failing.
 */
export function resolveVariant(selection: {
    expansion: ExpansionId;
    scenario?: ScenarioId;
    playerCount: PlayerCount;
}): BoardVariant {
    const candidates = listVariants(selection.expansion, selection.scenario);
    const match = candidates.find(v => v.playerCount === selection.playerCount);
    return match ?? candidates[0] ?? BOARD_VARIANTS[0];
}

export * from './classic';
export * from './seafarers-common';
export * from './seafarers-four-islands';
export * from './seafarers-new-shores';
