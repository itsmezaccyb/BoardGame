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
    victoryPoints: -1 // varies
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
    commodityType: 'science'
  },
  {
    id: 'trade-improvement',
    name: 'Trade',
    costs: [
      { resource: 'cloth', amount: 1 }
    ],
    victoryPoints: -1, // varies by level
    commodityType: 'trade'
  },
  {
    id: 'politics-improvement',
    name: 'Politics',
    costs: [
      { resource: 'coin', amount: 1 }
    ],
    victoryPoints: -1, // varies by level
    commodityType: 'politics'
  }
];

export const RESOURCE_LOGOS: Record<ResourceType, string | null> = {
  brick: '/images/catan_brick_logo.png',
  wood: '/images/catan_wood_logo.png',
  wheat: '/images/catan_wheat_logo.png',
  sheep: '/images/catan_sheep_logo.png',
  ore: '/images/catan_rock_logo.png',
  paper: null,
  cloth: null,
  coin: null
};

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

export function getBuildingsForVariant(
  expansion: 'classic' | 'seafarers',
  citiesAndKnights: boolean
): BuildingCost[] {
  let buildings = [...BASE_BUILDINGS];

  // Cities & Knights replaces development cards
  if (citiesAndKnights) {
    buildings = buildings.filter(b => b.id !== 'development-card');
    buildings = [...buildings, ...CITIES_AND_KNIGHTS_BUILDINGS];
  }

  // Seafarers adds ships
  if (expansion === 'seafarers') {
    buildings = [...buildings, ...SEAFARERS_BUILDINGS];
  }

  return buildings;
}
