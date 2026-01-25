# Catan Board Generator - Comprehensive Code Analysis

## Table of Contents
1. [Overview](#overview)
2. [Imports and Dependencies](#imports-and-dependencies)
3. [TypeScript Types and Interfaces](#typescript-types-and-interfaces)
4. [React Hooks](#react-hooks)
5. [State Variables](#state-variables)
6. [Helper Functions](#helper-functions)
7. [Hex Generation Logic](#hex-generation-logic)
8. [Resource Distribution System](#resource-distribution-system)
9. [Number Assignment System](#number-assignment-system)
10. [Game Modes](#game-modes)
11. [Number Swapping Feature](#number-swapping-feature)
12. [Rendering Logic](#rendering-logic)
13. [Notable Features](#notable-features)

---

## Overview

This is a Next.js page component (`page.tsx`) that generates randomized Settlers of Catan game boards. It supports multiple game modes including Classic Catan (4 and 5-6 players) and Seafarers expansion scenarios (Heading for New Shores and 4 Islands). The component generates hex-based game boards with proper resource distribution, number tokens, ports, and visual styling that matches official Catan board designs.

---

## Imports and Dependencies

### External Dependencies
```typescript
'use client';  // Next.js client component directive
import { useState, useMemo, useEffect } from 'react';
```
- **`useState`**: Manages component state (player count, expansion type, randomization seed, etc.)
- **`useMemo`**: Memoizes expensive computations (hex generation, port placements)
- **`useEffect`**: Handles side effects (auto-randomization on config changes)

### Internal Dependencies
```typescript
import { inchesToPixels } from '@/lib/dimensions';
import { GameSettingsPanel } from '@/components/GameSettingsPanel';
import { getImageUrl } from '@/lib/image-mapping';
```
- **`inchesToPixels`**: Converts physical Catan board measurements (in inches) to pixel dimensions
- **`GameSettingsPanel`**: UI component for game configuration controls
- **`getImageUrl`**: Maps resource image paths (handles both local and storage bucket URLs)

---

## TypeScript Types and Interfaces

### ResourceType
```typescript
type ResourceType = 'forest' | 'pasture' | 'field' | 'mountain' | 'hill' | 'desert' | 'gold' | 'water';
```
Defines all possible hex resource types:
- **forest**: Wood (trees)
- **pasture**: Sheep (grass)
- **field**: Wheat (grain)
- **mountain**: Ore (rock)
- **hill**: Brick (clay)
- **desert**: No resource
- **gold**: Special Seafarers resource
- **water**: Ocean tiles (Seafarers only)

### Hex Interface
```typescript
interface Hex {
    id: string;           // Unique identifier (format: "hex-{row}-{col}")
    x: number;            // X-coordinate position in pixels
    y: number;            // Y-coordinate position in pixels
    resourceType: ResourceType;  // What resource this hex produces
    number?: number;      // Production number (2-12, excluding 7), optional for deserts/water
}
```

### ExpansionType
```typescript
type ExpansionType = 'classic' | 'seafarers';
```
Determines which base game rules to use.

### ScenarioType
```typescript
type ScenarioType = 'heading-for-new-shores' | '4-islands';
```
Defines Seafarers expansion scenarios.

### ScenarioConfig
```typescript
type ScenarioConfig = {
    layout: string[][];  // 2D array defining land/water pattern
    placementRules?: (
        hexes: Hex[],
        resources: ResourceType[],
        seed: number,
        rows: Array<{ count: number; offset: number }>,
        counts: Partial<Record<ResourceType, number>>,
        playerCount: 3 | 4 | 6 | '5-6'
    ) => Hex[];
    zones?: {
        mainland?: { rows: number[] };
        islands?: { rows: number[] };
        channel?: { rows: number[] };
    };
};
```
Configuration object for scenario-specific board layouts and placement logic.

---

## React Hooks

### useState Hooks

1. **`expansion`**: Current expansion type (classic or seafarers)
   ```typescript
   const [expansion, setExpansion] = useState<ExpansionType>('classic');
   ```

2. **`playerCount`**: Number of players (3, 4, 6, or '5-6')
   ```typescript
   const [playerCount, setPlayerCount] = useState<3 | 4 | 6 | '5-6'>(4);
   ```

3. **`scenario`**: Active Seafarers scenario
   ```typescript
   const [scenario, setScenario] = useState<ScenarioType>('heading-for-new-shores');
   ```

4. **`randomSeed`**: Seed for deterministic random generation
   ```typescript
   const [randomSeed, setRandomSeed] = useState(0);
   ```

5. **`citiesAndKnights`**: Toggle for Cities & Knights expansion features
   ```typescript
   const [citiesAndKnights, setCitiesAndKnights] = useState<boolean>(false);
   ```

6. **`selectedHexId`**: ID of hex selected for number swapping
   ```typescript
   const [selectedHexId, setSelectedHexId] = useState<string | null>(null);
   ```

7. **`numberSwaps`**: Map tracking swapped number tokens
   ```typescript
   const [numberSwaps, setNumberSwaps] = useState<Map<string, number>>(new Map());
   ```

### useEffect Hooks

1. **Auto-randomization**: Triggers new random board when player count or scenario changes
   ```typescript
   useEffect(() => {
       setRandomSeed(Math.random() * 10000);
   }, [playerCount, scenario]);
   ```

2. **Clear swaps on config change**: Resets number swaps when board regenerates
   ```typescript
   useEffect(() => {
       setNumberSwaps(new Map());
       setSelectedHexId(null);
   }, [randomSeed, playerCount, expansion, scenario]);
   ```

### useMemo Hooks

1. **`hexes`**: Memoized hex array generation (main board logic)
2. **`buildBigIslandPerimeter`**: Seafarers big island border coordinates
3. **`perimeterPoints`**: Classic game outer border coordinates
4. **`generatePortAssignments`**: Randomized port type assignments (Classic)
5. **`generateBigIslandPortAssignments`**: Port assignments for Seafarers big island
6. **`generateFourIslandsPortAssignments`**: Port assignments for 4 Islands scenario
7. **`fourIslandsPortPlacements`**: Calculated port positions for 4 Islands

---

## State Variables

### Game Configuration State
- **`expansion`**: Controls whether to use Classic or Seafarers rules
- **`playerCount`**: Determines board size and resource quantities
- **`scenario`**: Selects which Seafarers scenario to generate
- **`citiesAndKnights`**: Enables barbarian ship track display

### Randomization State
- **`randomSeed`**: Seeds all random operations for reproducible boards
  - Changes trigger complete board regeneration
  - Uses seeded random number generator for consistency

### Number Swapping State
- **`selectedHexId`**: Tracks first hex clicked for swapping
- **`numberSwaps`**: Stores permanent number swaps as Map<hexId, number>
  - Allows players to manually adjust unfair number distributions
  - Persists until board configuration changes

---

## Helper Functions

### Seeded Random Number Generator
```typescript
const seededRandom = (seed: number, index: number) => {
    const x = Math.sin(seed + index) * 10000;
    return x - Math.floor(x);  // Returns decimal portion (0-1)
};
```
**Purpose**: Generates deterministic pseudo-random numbers from a seed
**Use cases**: Shuffling resources, numbers, and port assignments reproducibly

### Resource Count Configuration
```typescript
const getResourceCounts = () => { ... }
```
**Returns**: Object mapping resource types to quantities
**Logic**:
- Classic 4-player: 4 forest/pasture/field, 3 mountain/hill, 1 desert
- Classic 5-6 player: 6 forest/pasture/field, 5 mountain/hill, 2 desert
- Seafarers: Varies by scenario and player count, includes gold and water tiles

### Row Configuration
```typescript
const getRowConfigurations = () => { ... }
```
**Returns**: Array of `{ count: number, offset: number }` objects
**Purpose**: Defines hexagon grid layout for each game mode
- **count**: Number of hexes in this row
- **offset**: Horizontal offset in hex widths (for interlocking pattern)

**Examples**:
- Classic 4-player: `[3, 4, 5, 4, 3]` (19 hexes)
- Classic 5-6 player: `[4, 5, 6, 6, 5, 4]` (30 hexes)
- Seafarers 4-player: `[5, 6, 7, 8, 7, 6, 5]` (44 hexes)

### Number Distribution
```typescript
const getNumberDistribution = () => { ... }
```
**Returns**: Object mapping dice numbers (2-12, excluding 7) to quantities
**Logic**:
- Higher probability numbers (6, 8) get more tokens
- Distribution ensures balanced resource production
- Varies by player count for game balance

**Example (Classic 4-player)**:
```typescript
{ 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 1 }
```

### Dot Count (Probability Indicator)
```typescript
const getDotCount = (number: number): number => {
    const dotMap: Record<number, number> = {
        2: 1, 12: 1,  // Least likely (1/36 probability)
        3: 2, 11: 2,  // 2/36 probability
        4: 3, 10: 3,  // 3/36 probability
        5: 4, 9: 4,   // 4/36 probability
        6: 5, 8: 5,   // 5/36 probability (most likely)
    };
    return dotMap[number] || 0;
};
```
**Purpose**: Displays probability dots on number tokens (like official Catan boards)

### Neighbor Detection
```typescript
const getNeighbors = (rowIndex: number, colIndex: number, rows: Array<...>): Array<{ row: number; col: number }> => { ... }
```
**Purpose**: Finds all adjacent hexes for a given position
**Algorithm**:
1. Calculates offset differences between rows
2. Determines which hexes in adjacent rows share edges
3. Returns array of up to 6 neighbor coordinates

**Used for**:
- Anti-clumping resource placement
- Preventing adjacent 6s and 8s
- Validating board generation constraints

### Hex Position Lookup
```typescript
const getHexAt = (rowIndex: number, colIndex: number, hexesArray: Hex[], rows: Array<...>): Hex | null => { ... }
```
**Purpose**: Converts 2D row/col coordinates to flat array index and retrieves hex

### Coordinate Conversion
```typescript
const getRowColFromIndex = (index: number, rows: Array<...>): { row: number; col: number } | null => { ... }
```
**Purpose**: Reverse operation - converts flat array index to 2D coordinates

### Resource Clumping Detection
```typescript
const countAdjacentResources = (resourceType: ResourceType, rowIndex: number, colIndex: number, placedHexes: Hex[], rows: Array<...>): number => { ... }
```
**Purpose**: Counts how many neighboring hexes have the same resource type

```typescript
const hasResourceClumping = (resourceType: ResourceType, rowIndex: number, colIndex: number, placedHexes: Hex[], rows: Array<...>, maxCount: number = 2): boolean => { ... }
```
**Purpose**: Checks if placing a resource would violate anti-clumping rules (more than 2 adjacent of same type)

### High Number Adjacency Check
```typescript
const hasHighNumberAdjacency = (number: number, rowIndex: number, colIndex: number, hexesArray: Hex[], rows: Array<...>): boolean => { ... }
```
**Purpose**: Prevents 6s and 8s from being adjacent (official Catan fairness rule)
**Returns**: `true` if placing this number would create a violation

---

## Hex Generation Logic

### Main Generation Function
The `hexes` useMemo hook generates the complete board:

```typescript
const hexes = useMemo(() => {
    const hexesArray: Hex[] = [];
    const verticalOffset = expansion === 'classic' && playerCount === '5-6' ? -0.5 * verticalSpacing : 0;
    const counts = getResourceCounts();

    // Different logic for Seafarers vs Classic
    if (expansion === 'seafarers') {
        // Seafarers generation
    } else {
        // Classic generation
    }

    return hexesArray;
}, [randomSeed, playerCount, expansion]);
```

### Hexagon Dimensions
```typescript
const hexWidth = inchesToPixels(3.12 * 0.9);   // Scaled from official 3.12"
const hexHeight = inchesToPixels(3.6 * 0.9);   // Scaled from official 3.6"
const verticalSpacing = hexHeight * 0.75;       // 25% overlap for interlocking
```
**Note**: Dimensions based on actual Catan board measurements, scaled down 10% to fit screen better

### Position Calculation
For each hex in each row:
```typescript
const startX = row.offset * hexWidth;  // Row offset for interlocking pattern
const x = startX + colIndex * hexWidth;  // Column position
const y = rowIndex * verticalSpacing + verticalOffset;  // Row position with overlap
```

### Hexagon Point Calculation
```typescript
const getHexagonPoints = (centerX: number, centerY: number): string => {
    const w = hexWidth / 2;
    const h = hexHeight / 2;

    const points = [
        [centerX, centerY - h],           // top
        [centerX + w, centerY - h / 2],   // top-right
        [centerX + w, centerY + h / 2],   // bottom-right
        [centerX, centerY + h],           // bottom
        [centerX - w, centerY + h / 2],   // bottom-left
        [centerX - w, centerY - h / 2],   // top-left
    ];

    return points.map(([x, y]) => `${x},${y}`).join(' ');
};
```
**Purpose**: Generates SVG polygon points for flat-top hexagon shape

---

## Resource Distribution System

### Classic Catan Distribution
1. **Create resource pool** from counts:
   ```typescript
   const resourcesArray: ResourceType[] = [];
   Object.entries(counts).forEach(([resource, count]) => {
       for (let i = 0; i < count; i++) {
           resourcesArray.push(resource);
       }
   });
   ```

2. **Shuffle using seeded random**:
   ```typescript
   for (let i = resourcesArray.length - 1; i > 0; i--) {
       const j = Math.floor(seededRandom(randomSeed, i) * (i + 1));
       [resourcesArray[i], resourcesArray[j]] = [resourcesArray[j], resourcesArray[i]];
   }
   ```

3. **Assign sequentially** to hex positions

### Seafarers Distribution
Uses scenario-specific placement rules:

#### Heading for New Shores
**Strategy**: Separate big island from small islands
1. Define fixed water positions
2. Designate big island hexes and small island zones
3. Distribute resources separately to each zone
4. Randomly select some small island positions to become water
5. Shuffle and assign

**Big Island Resources (4-player example)**:
- 1 desert + 18 resource hexes
- Resources split: 3 of each type base + random distribution

**Small Island Resources (4-player example)**:
- 2 gold + 7 other resources
- Ensures diverse resource access

#### 4 Islands Scenario
**Strategy**: Use pre-defined templates for island shapes
1. Select random template from available set
2. Template defines which hex indices are land vs water
3. Build resource pool based on player count
4. Shuffle and assign to land hexes only

**Templates**: Each player count has 3-8 different island configurations for variety

---

## Number Assignment System

### Number Pool Generation
```typescript
const numberDistribution = getNumberDistribution();
const numbersArray: number[] = [];
Object.entries(numberDistribution).forEach(([num, count]) => {
    for (let i = 0; i < count; i++) {
        numbersArray.push(parseInt(num));
    }
});
```

### Constraint-Based Assignment
```typescript
const assignNumbersWithConstraints = (
    hexesArray: Hex[],
    numbersArray: number[],
    rows: Array<{ count: number; offset: number }>,
    seed: number
): boolean => { ... }
```

**Algorithm**:
1. Identify all hexes needing numbers (exclude water and desert)
2. For each hex:
   - Try to assign next number from shuffled array
   - Check if it violates high number adjacency rule (6s/8s touching)
   - If violation, try next available number
   - Swap successful number to front of array for next iteration
3. Return `false` if any hex can't be assigned without violations

### Retry Logic with Different Shuffles
```typescript
let success = false;
let retryCount = 0;
const maxRetries = 100;

while (!success && retryCount < maxRetries) {
    const shuffleSeed = randomSeed + 1000 + retryCount;

    // Shuffle numbers with new seed
    for (let i = numbersArray.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(shuffleSeed, i) * (i + 1));
        [numbersArray[i], numbersArray[j]] = [numbersArray[j], numbersArray[i]];
    }

    // Try assignment
    success = assignNumbersWithConstraints(hexesArray, numbersArray, rows, shuffleSeed);

    if (!success) {
        // Clear and retry
        hexesArray.forEach(hex => {
            if (hex.resourceType !== 'water' && hex.resourceType !== 'desert') {
                hex.number = undefined;
            }
        });
        retryCount++;
    }
}
```
**Purpose**: Ensures valid number placement even with constraint violations

---

## Game Modes

### Classic Mode

#### 4-Player (Base Game)
- **Board Shape**: 3-4-5-4-3 pattern (19 hexes)
- **Resources**: 4 forest/pasture/field, 3 mountain/hill, 1 desert
- **Numbers**: 18 tokens (one per resource hex)
- **Ports**: 9 ports (5 specific resource 2:1, 4 generic 3:1)

#### 5-6 Player Extension
- **Board Shape**: 4-5-6-6-5-4 pattern (30 hexes)
- **Resources**: 6 forest/pasture/field, 5 mountain/hill, 2 desert
- **Numbers**: 28 tokens
- **Ports**: 11 ports (6 specific, 5 generic)

### Seafarers Mode

#### Heading for New Shores

**3-Player**:
- Board: 4-5-6-7-6-5-4 pattern (37 hexes)
- Big island: 14 hexes (no desert)
- Small islands: 12 hexes → 8 land (after random water placement)
- Gold: 2 hexes on small islands
- Ports: 8 total

**4-Player**:
- Board: 5-6-7-8-7-6-5 pattern (44 hexes)
- Big island: 19 hexes (1 desert + 18 resources)
- Small islands: 13 hexes → 9 land
- Gold: 2 hexes
- Water: 16 permanent + 4 random on small islands
- Ports: 9 total

**6-Player**:
- Board: 7-8-9-10-9-8-7 pattern (58 hexes)
- Big island: 30 hexes (2 desert + 28 resources)
- Small islands: 12 hexes → 10 land
- Gold: 3 hexes
- Ports: 11 total

#### 4 Islands

**Features**:
- Pre-defined island templates (8 for 4-player, 3 for 3-player, 5 for 6-player)
- All resources distributed across 4 separate islands
- No gold or desert
- Each template creates different strategic layouts
- Ports placed on specific hex edges per template

**3-Player**:
- 20 land hexes: 4 of each resource type
- 9 ports

**4-Player**:
- 23 land hexes: 5 wood/sheep/wheat, 4 brick/rock
- 9 ports

**6-Player**:
- 32 land hexes: 7 wood/sheep, 6 wheat/brick/rock
- 11 ports

---

## Number Swapping Feature

### State Management
```typescript
const [selectedHexId, setSelectedHexId] = useState<string | null>(null);
const [numberSwaps, setNumberSwaps] = useState<Map<string, number>>(new Map());
```

### Getting Effective Number
```typescript
const getEffectiveNumber = (hexId: string, originalNumber: number | undefined): number | undefined => {
    return numberSwaps.get(hexId) ?? originalNumber;
};
```
**Purpose**: Returns swapped number if exists, otherwise original

### Click Handler
```typescript
const handleNumberTokenClick = (hex: Hex) => {
    const effectiveNumber = getEffectiveNumber(hex.id, hex.number);
    if (effectiveNumber === undefined) return;  // Ignore hexes without numbers

    if (selectedHexId === null) {
        // First click - select this hex
        setSelectedHexId(hex.id);
    } else if (selectedHexId === hex.id) {
        // Clicking same hex - deselect
        setSelectedHexId(null);
    } else {
        // Second click - perform swap
        const selectedHex = hexes.find(h => h.id === selectedHexId);
        if (selectedHex) {
            const num1 = getEffectiveNumber(selectedHex.id, selectedHex.number);
            const num2 = getEffectiveNumber(hex.id, hex.number);

            if (num1 !== undefined && num2 !== undefined) {
                const newSwaps = new Map(numberSwaps);
                newSwaps.set(selectedHex.id, num2);  // First hex gets second number
                newSwaps.set(hex.id, num1);          // Second hex gets first number
                setNumberSwaps(newSwaps);
            }
        }
        setSelectedHexId(null);  // Clear selection
    }
};
```

### Visual Feedback
```typescript
const isSelected = selectedHexId === hex.id;

<div
    style={{
        backgroundColor: isSelected ? '#87ceeb' : '#f5f5dc',  // Blue when selected
        border: isSelected ? '3px solid #4169e1' : 'none',
        boxShadow: isSelected
            ? '0 0 12px rgba(65, 105, 225, 0.6)'  // Glow effect
            : '0 2px 4px rgba(0,0,0,0.3)',
        cursor: 'pointer',
        // ...
    }}
>
```

---

## Rendering Logic

### Main Layout Structure
```typescript
<main className="h-screen w-screen ...">  {/* Full screen container */}
    <div style={{ width: boardWidth, height: boardHeight }}>  {/* Board container */}
        <div style={{ transform: playerCount === 3 ? 'rotate(90deg)' : undefined }}>  {/* Rotation wrapper */}
            {/* SVG masks */}
            {/* Border overlays */}
            {/* Ports */}
            {/* Water borders */}
            {/* Barbarian track */}
            {/* Hex tiles */}
        </div>
    </div>
    <GameSettingsPanel>  {/* Controls */}
        {/* Buttons and options */}
    </GameSettingsPanel>
</main>
```

### Layer Order (z-index)
1. **Background**: Water texture (`backgroundImage`)
2. **Base (z-index: 1)**: Water hex borders, ports
3. **Hexes (z-index: 2)**: Resource tiles and borders
4. **Borders (z-index: 10)**: Perimeter/island borders, barbarian track
5. **Tokens**: Number tokens (positioned absolutely within hexes)

### Hex Rendering
Each hex is rendered as a separate absolutely-positioned div:

```typescript
hexes.map((hex) => (
    <div key={hex.id} style={{ position: 'absolute', left: hex.x, top: hex.y, ... }}>
        {/* Resource background image with hexagonal clip-path */}
        <div style={{ clipPath: `polygon(${getHexagonClipPath()})`, ... }}>
            <div style={{ backgroundImage: resourceImages[hex.resourceType], ... }} />
        </div>

        {/* Border gradient overlay (SVG) */}
        <svg>
            <radialGradient>  {/* Fading border effect */}
            <polygon />  {/* Inner border */}
            <polygon />  {/* Outer border */}
        </svg>

        {/* Number token */}
        {hex.number && (
            <div onClick={handleNumberTokenClick} style={{ ... }}>
                <span>{effectiveNumber}</span>
                <div>  {/* Probability dots */}
                    {Array.from({ length: getDotCount(effectiveNumber) }).map(...)}
                </div>
            </div>
        )}
    </div>
))
```

### Special Rendering: Seafarers Rotation
For Seafarers 3-player, resources are rotated -90deg to match physical game pieces:
```typescript
{expansion === 'seafarers' ? (
    <div style={{ clipPath: ..., overflow: 'hidden' }}>
        <div style={{
            transform: 'rotate(-90deg)',
            backgroundImage: resourceImages[hex.resourceType],
            width: `${Math.max(hexWidth, hexHeight) * 1.414}px`,  // Diagonal coverage
            ...
        }} />
    </div>
) : (
    <div style={{ backgroundImage: resourceImages[hex.resourceType], clipPath: ... }} />
)}
```

### Border Rendering

#### Classic Perimeter Border
```typescript
{perimeterPoints.map((point, idx) => {
    const nextPoint = perimeterPoints[(idx + 1) % perimeterPoints.length];
    return (
        <line
            x1={point.x} y1={point.y}
            x2={nextPoint.x} y2={nextPoint.y}
            stroke="#E6D7AA"  // Light brown
            strokeWidth="25"
            filter="url(#borderFade)"  // Gaussian blur
        />
    );
})}
```
**Technique**: Connects perimeter vertex points with filtered SVG lines to create glowing border

#### Seafarers Big Island Border
Similar technique but traces only big island hexes, creating distinct land mass appearance

### Port Rendering
Ports placed at midpoints between specific perimeter vertices:
```typescript
const midX = (p1.x + p2.x) / 2;
const midY = (p1.y + p2.y) / 2;
const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI) + 180;

<div style={{
    position: 'absolute',
    left: `${midX - portOffset}px`,
    top: `${midY - portOffset}px`,
    transform: `rotate(${angle}deg)`,
}}>
    <img src={`/images/catan_boat_${portType}.png`} />
</div>
```
**Rotation**: Calculated from vertex angle so boats face outward from island

---

## Notable Features

### 1. Dimension Accuracy
Uses actual Catan board measurements (3.12" x 3.6" hexes) converted to pixels for authentic appearance

### 2. Seeded Randomization
All randomness is deterministic based on seed - same seed always produces same board
- Enables sharing specific board configurations
- Useful for debugging and testing

### 3. Anti-Clumping Logic
Prevents more than 2 adjacent hexes of same resource type (would be commented out if enabled - currently not active in the code)

### 4. No Adjacent 6s/8s Rule
Official Catan tournament rule enforced through constraint-based number assignment with retry logic

### 5. Responsive Scaling
Board auto-scales to fit screen:
```typescript
maxWidth: '95vw',
maxHeight: '80vh',
```

### 6. Cities & Knights Integration
Displays barbarian ship track when enabled:
- 8 circular positions
- Positioned on left side (or top for rotated boards)
- First position filled to show starting location

### 7. Port Randomization
Port types shuffled each board generation but follow official distributions:
- 5 specific resource ports (one per type)
- 4 generic 3:1 ports (4-player)
- Extra ports for larger player counts

### 8. Multiple Scenario Support
Modular architecture allows easy addition of new scenarios:
```typescript
const scenarioConfigs: Record<ScenarioType, ScenarioConfig> = {
    '4-islands': { layout: [...], placementRules: fourIslandsPlacement },
    'heading-for-new-shores': { layout: [...], placementRules: headingForNewShoresPlacement },
};
```

### 9. Visual Polish
- Radial gradient borders on hexes (darker at edges)
- Multiple border layers for depth
- Gaussian blur filters on island borders
- Proper z-index layering
- Smooth transitions and hover effects

### 10. Probability Indicators
Number tokens show 1-5 dots indicating dice roll probability (matching official boards)

### 11. 3-Player Board Rotation
Automatically rotates Seafarers 3-player boards 90° for better screen fit:
```typescript
transform: playerCount === 3 ? 'rotate(90deg)' : undefined
```

### 12. Template System for Island Scenarios
4 Islands scenario uses pre-defined templates (8 variations for 4-player) ensuring interesting, balanced layouts rather than pure random generation

### 13. Water Hex Styling
Water hexes rendered with subtle blue borders but transparent fill (background ocean shows through)

### 14. Manual Board Adjustment
Number swapping allows players to fix perceived imbalances after generation

---

## Code Quality & Architecture

### Strengths
- **Modular design**: Separate functions for each concern
- **Type safety**: Full TypeScript typing throughout
- **Performance**: useMemo prevents unnecessary recalculations
- **Maintainability**: Clear function names and logical organization
- **Extensibility**: Easy to add new scenarios or game modes

### Potential Improvements
- Resource clumping detection is defined but not currently enforced
- Some magic numbers could be extracted to constants
- Port placement logic is quite verbose (could be data-driven)
- Limited error handling for edge cases

---

## Summary

This is a sophisticated board game generator that faithfully recreates Settlers of Catan's random setup system with multiple expansions and scenarios. The code demonstrates advanced React patterns (memoization, effects), complex geometric calculations (hexagon positioning, neighbor detection), constraint-based generation (number placement rules), and careful attention to visual presentation. The architecture is modular and extensible, making it easy to add new game modes or modify existing behavior.
