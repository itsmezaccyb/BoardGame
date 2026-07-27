export type ResourceType = 'brick' | 'wood' | 'wheat' | 'sheep' | 'ore' | 'paper' | 'cloth' | 'coin';

export interface ResourceCost {
  resource: ResourceType;
  amount: number;
}

export interface BuildingCost {
  id: string;
  name: string;
  costs: ResourceCost[];
  victoryPoints: number; // -1 means "varies"
  commodityType?: 'science' | 'trade' | 'politics'; // For city improvements
  showVPPerLevel?: boolean; // If true, show "per lvl", otherwise just show the number
}

export const BASE_BUILDINGS: BuildingCost[] = [
  {
    id: 'road',
    name: 'Road',
    costs: [
      { resource: 'brick', amount: 1 },
      { resource: 'wood', amount: 1 }
    ],
    victoryPoints: 0
  },
  {
    id: 'settlement',
    name: 'Settlement',
    costs: [
      { resource: 'brick', amount: 1 },
      { resource: 'wood', amount: 1 },
      { resource: 'wheat', amount: 1 },
      { resource: 'sheep', amount: 1 }
    ],
    victoryPoints: 1
  },
  {
    id: 'city',
    name: 'City',
    costs: [
      { resource: 'wheat', amount: 2 },
      { resource: 'ore', amount: 3 }
    ],
    victoryPoints: 2
  },
  {
    id: 'development-card',
    name: 'Development Card',
    costs: [
      { resource: 'wheat', amount: 1 },
      { resource: 'sheep', amount: 1 },
      { resource: 'ore', amount: 1 }
    ],
    victoryPoints: -1, // varies
    showVPPerLevel: false
  }
];

export const SEAFARERS_BUILDINGS: BuildingCost[] = [
  {
    id: 'ship',
    name: 'Ship',
    costs: [
      { resource: 'sheep', amount: 1 },
      { resource: 'wood', amount: 1 }
    ],
    victoryPoints: 0
  }
];

export const CITIES_AND_KNIGHTS_BUILDINGS: BuildingCost[] = [
  {
    id: 'basic-knight',
    name: 'Basic Knight',
    costs: [
      { resource: 'sheep', amount: 1 },
      { resource: 'ore', amount: 1 }
    ],
    victoryPoints: 0
  },
  {
    id: 'activate-knight',
    name: 'Activate Knight',
    costs: [
      { resource: 'wheat', amount: 1 }
    ],
    victoryPoints: 0
  },
  {
    id: 'promote-knight',
    name: 'Promote Knight',
    costs: [
      { resource: 'sheep', amount: 1 },
      { resource: 'ore', amount: 1 }
    ],
    victoryPoints: 0
  },
  {
    id: 'city-walls',
    name: 'City Walls',
    costs: [
      { resource: 'brick', amount: 2 }
    ],
    victoryPoints: 0
  },
  {
    id: 'science-improvement',
    name: 'Science',
    costs: [
      { resource: 'paper', amount: 1 }
    ],
    victoryPoints: -1, // varies by level
    commodityType: 'science',
    showVPPerLevel: true
  },
  {
    id: 'trade-improvement',
    name: 'Trade',
    costs: [
      { resource: 'cloth', amount: 1 }
    ],
    victoryPoints: -1, // varies by level
    commodityType: 'trade',
    showVPPerLevel: true
  },
  {
    id: 'politics-improvement',
    name: 'Politics',
    costs: [
      { resource: 'coin', amount: 1 }
    ],
    victoryPoints: -1, // varies by level
    commodityType: 'politics',
    showVPPerLevel: true
  }
];

/**
 * Resource icons used by the legend, keyed by tile style.
 * A `null` entry falls back to the coloured commodity badge.
 *
 * To support a new tile style, add a matching key here.
 */
export const RESOURCE_LOGOS_BY_STYLE: Record<string, Record<ResourceType, string | null>> = {
  classic: {
    brick: '/images/catan_brick_logo.png',
    wood: '/images/catan_wood_logo.png',
    wheat: '/images/catan_wheat_logo.png',
    sheep: '/images/catan_sheep_logo.png',
    ore: '/images/catan_rock_logo.png',
    paper: null,
    cloth: null,
    coin: null
  },
  simple: {
    brick: '/images/catan_brick_logo_style.png',
    wood: '/images/catan_wood_logo_style.png',
    wheat: '/images/catan_wheat_logo_style.png',
    sheep: '/images/catan_sheep_logo_stle.png',
    ore: '/images/catan_rock_logo_style.png',
    paper: null,
    cloth: null,
    coin: null
  }
};

export function getResourceLogo(resource: ResourceType, tileStyle: string): string | null {
  const set = RESOURCE_LOGOS_BY_STYLE[tileStyle] ?? RESOURCE_LOGOS_BY_STYLE.classic;
  return set[resource];
}

export const COMMODITY_COLORS: Record<'science' | 'trade' | 'politics', string> = {
  science: '#22c55e', // green
  trade: '#eab308', // yellow
  politics: '#3b82f6' // blue
};

export const COMMODITY_LABELS: Record<'science' | 'trade' | 'politics', string> = {
  science: 'Paper',
  trade: 'Cloth',
  politics: 'Coin'
};

export interface VariantContext {
  expansion: string;
  citiesAndKnights: boolean;
}

/**
 * A group of buildings contributed by one expansion or module.
 *
 * ---------------------------------------------------------------------------
 * TO ADD BUILDINGS FOR A NEW EXPANSION
 * ---------------------------------------------------------------------------
 * Append a set below with an `appliesTo` test. Sets are applied in order, so a
 * later set can `removes` entries an earlier one added.
 */
export interface BuildingSet {
  id: string;
  buildings: BuildingCost[];
  /** Building ids this set removes, e.g. C&K replacing development cards. */
  removes?: string[];
  appliesTo: (ctx: VariantContext) => boolean;
}

export const BUILDING_SETS: BuildingSet[] = [
  {
    id: 'base',
    buildings: BASE_BUILDINGS,
    appliesTo: () => true
  },
  {
    id: 'cities-and-knights',
    buildings: CITIES_AND_KNIGHTS_BUILDINGS,
    removes: ['development-card'],
    appliesTo: ctx => ctx.citiesAndKnights
  },
  {
    id: 'seafarers',
    buildings: SEAFARERS_BUILDINGS,
    appliesTo: ctx => ctx.expansion === 'seafarers'
  }
];

export function getBuildingsForVariant(
  expansion: string,
  citiesAndKnights: boolean
): BuildingCost[] {
  const ctx: VariantContext = { expansion, citiesAndKnights };

  return BUILDING_SETS.filter(set => set.appliesTo(ctx)).reduce<BuildingCost[]>(
    (buildings, set) => [
      ...buildings.filter(b => !set.removes?.includes(b.id)),
      ...set.buildings
    ],
    []
  );
}
