'use client';

import { inchesToPixels } from '@/lib/dimensions';
import { useState, useMemo, useEffect } from 'react';
import { GameSettingsPanel } from '@/components/GameSettingsPanel';
import { getImageUrl } from '@/lib/image-mapping';

type ResourceType = 'forest' | 'pasture' | 'field' | 'mountain' | 'hill' | 'desert' | 'gold' | 'water';

interface Hex {
    id: string;
    x: number;
    y: number;
    resourceType: ResourceType;
    number?: number;
}

type ExpansionType = 'classic' | 'seafarers';
type ScenarioType = 'heading-for-new-shores' | '4-islands';

export default function CatanPage() {
    const [expansion, setExpansion] = useState<ExpansionType>('classic');
    const [playerCount, setPlayerCount] = useState<3 | 4 | 6 | '5-6'>(4);
    const [scenario, setScenario] = useState<ScenarioType>('heading-for-new-shores');
    const [randomSeed, setRandomSeed] = useState(0);

    // Auto-randomize on mount, player count change, and scenario change
    useEffect(() => {
        setRandomSeed(Math.random() * 10000);
    }, [playerCount, scenario]);

    // Force 4-player mode for 4-islands scenario
    useEffect(() => {
        if (scenario === '4-islands' && playerCount !== 4) {
            setPlayerCount(4);
        }
    }, [scenario, playerCount]);

    // Resource image mapping
    const resourceImages: Record<ResourceType, string> = {
        forest: getImageUrl('/images/catan_woods.png'),
        pasture: getImageUrl('/images/catan_sheep.png'),
        field: getImageUrl('/images/catan_wheat.png'),
        mountain: getImageUrl('/images/catan_rock.png'),
        hill: getImageUrl('/images/catan_brick.png'),
        desert: getImageUrl('/images/catan_desert.png'),
        gold: getImageUrl('/images/catan_gold.jpg'),
        water: '', // Clear/transparent for water tiles since background is sea
    };

    // Resource counts for each expansion and player mode
    const getResourceCounts = () => {
        if (expansion === 'classic') {
            return playerCount === 4 ? {
                forest: 4,
                pasture: 4,
                field: 4,
                mountain: 3,
                hill: 3,
                desert: 1,
            } : {
                forest: 6,
                pasture: 6,
                field: 6,
                mountain: 5,
                hill: 5,
                desert: 2,
            };
        } else {
            // Seafarers scenarios
            if (playerCount === 3) {
                // 3-player "Heading for New Shores": fewer resources
                return {
                    forest: 4,    // wood
                    pasture: 4,   // sheep
                    field: 4,     // wheat
                    mountain: 4,  // rock
                    hill: 4,      // brick
                    desert: 1,
                    gold: 2,
                    water: 13,    // fewer water tiles for smaller board
                };
            } else if (playerCount === 6) {
                // 6-player "Heading for New Shores"
                return {
                    forest: 7,    // wood (6 on big island + 1 on small islands)
                    pasture: 7,   // sheep (6 on big island + 1 on small islands)
                    field: 7,     // wheat (6 on big island + 1 on small islands)
                    mountain: 7,  // rock (5 on big island + 2 on small islands)
                    hill: 7,      // brick (5 on big island + 2 on small islands)
                    desert: 2,    // 2 desert on big island
                    gold: 3,      // 3 gold on small islands
                    water: 18,    // 16 permanent + 2 small island water
                };
            } else {
                // 4-player "Heading for New Shores"
                return {
                    forest: 5,    // wood
                    pasture: 5,   // sheep
                    field: 5,     // wheat
                    mountain: 5,  // rock
                    hill: 5,      // brick
                    desert: 1,
                    gold: 2,
                    water: 16,
                };
            }
        }
    };

    // Hexagon dimensions based on Catan specifications (scaled to 0.9)
    const hexWidth = inchesToPixels(3.12 * 0.9);
    const hexHeight = inchesToPixels(3.6 * 0.9);
    const verticalSpacing = hexHeight * 0.75; // 25% overlap for interlocking

    // Row configurations for different expansions and player counts
    const getRowConfigurations = () => {
        if (expansion === 'classic') {
            return playerCount === 4 ? [
                { count: 3, offset: 1 },
                { count: 4, offset: 0.5 },
                { count: 5, offset: 0 },
                { count: 4, offset: 0.5 },
                { count: 3, offset: 1 },
            ] : [
                { count: 4, offset: 1 },
                { count: 5, offset: 0.5 },
                { count: 6, offset: 0 },
                { count: 6, offset: -0.5 },
                { count: 5, offset: 0 },
                { count: 4, offset: 0.5 },
            ];
        } else {
            // Seafarers scenarios
            if (scenario === '4-islands') {
                // 4-islands: 4-5-6-7-6-5-4 (4-player only for now)
                return [
                    { count: 4, offset: 1.5 },    // row 0
                    { count: 5, offset: 1 },      // row 1
                    { count: 6, offset: 0.5 },    // row 2
                    { count: 7, offset: 0 },      // row 3
                    { count: 6, offset: 0.5 },    // row 4
                    { count: 5, offset: 1 },      // row 5
                    { count: 4, offset: 1.5 },    // row 6
                ];
            } else if (playerCount === 3) {
                // 3-player "Heading for New Shores": 4-5-6-7-6-5-4
                return [
                    { count: 4, offset: 1.5 },    // row 0
                    { count: 5, offset: 1 },      // row 1
                    { count: 6, offset: 0.5 },    // row 2
                    { count: 7, offset: 0 },      // row 3
                    { count: 6, offset: 0.5 },    // row 4
                    { count: 5, offset: 1 },      // row 5
                    { count: 4, offset: 1.5 },    // row 6
                ];
            } else if (playerCount === 6) {
                // 6-player "Heading for New Shores": 7-8-9-10-9-8-7
                return [
                    { count: 7, offset: 1.5 },    // row 0
                    { count: 8, offset: 1 },      // row 1
                    { count: 9, offset: 0.5 },    // row 2
                    { count: 10, offset: 0 },     // row 3
                    { count: 9, offset: 0.5 },    // row 4
                    { count: 8, offset: 1 },      // row 5
                    { count: 7, offset: 1.5 },    // row 6
                ];
            } else {
                // 4-player "Heading for New Shores": 5-6-7-8-7-6-5
                return [
                    { count: 5, offset: 1.5 },    // row 0
                    { count: 6, offset: 1 },      // row 1
                    { count: 7, offset: 0.5 },    // row 2
                    { count: 8, offset: 0 },      // row 3
                    { count: 7, offset: 0.5 },    // row 4
                    { count: 6, offset: 1 },      // row 5
                    { count: 5, offset: 1.5 },    // row 6
                ];
            }
        }
    };

    const rows = getRowConfigurations();

    // Seeded random number generator for reproducibility
    const seededRandom = (seed: number, index: number) => {
        const x = Math.sin(seed + index) * 10000;
        return x - Math.floor(x);
    };

    // Number distribution: 2-12 (skipping 7)
    const getNumberDistribution = () => {
        if (expansion === 'seafarers') {
            if (playerCount === 3) {
                // 3-player "Heading for New Shores": 21 numbered hexes
                // Custom distribution: 2(1), 3(2),6(2),9(2),11(2), 4(3),5(3),8(3),10(3)
                return {
                    2: 1, 3: 2, 4: 3, 5: 3, 6: 2,
                    8: 3, 9: 2, 10: 3, 11: 2, 12: 1
                };
            } else if (playerCount === 6) {
                // 6-player "Heading for New Shores": 2&12(3), 3-11(4)
                return {
                    2: 3, 3: 4, 4: 4, 5: 4, 6: 4,
                    8: 4, 9: 4, 10: 4, 11: 4, 12: 3
                };
            } else {
                // 4-player "Heading for New Shores": 27 numbered hexes
                // Big island (18 numbers): 2,12 (1 each) + 3-11 (2 each) = 20, need to adjust
                // Small islands (9 numbers): 2-11 (1 each) = 9
                // Adjusted: Big gets 2,12 + 3,4,5,6,8,9,10,11 (8 numbers × 2 = 16) + 2 extras
                // Small gets 2,3,4,5,6,8,9,10,11 (8 numbers) + 1 extra
                return {
                    2: 2, 3: 3, 4: 3, 5: 3, 6: 3,
                    8: 3, 9: 3, 10: 3, 11: 3, 12: 1
                };
            }
        }

        const distribution: Record<number, number> = playerCount === 4 ? {
            2: 1, 3: 2, 4: 2, 5: 2, 6: 2,
            8: 2, 9: 2, 10: 2, 11: 2, 12: 1
        } : {
            // 5-6 players: one extra of each number
            2: 2, 3: 3, 4: 3, 5: 3, 6: 3,
            8: 3, 9: 3, 10: 3, 11: 3, 12: 2
        };
        return distribution;
    };

    // Get dot count for probability indicator
    const getDotCount = (number: number): number => {
        const dotMap: Record<number, number> = {
            2: 1, 12: 1,
            3: 2, 11: 2,
            4: 3, 10: 3,
            5: 4, 9: 4,
            6: 5, 8: 5,
        };
        return dotMap[number] || 0;
    };

    // ========== REUSABLE UTILITY FUNCTIONS ==========
    // These functions work with any layout structure, making them reusable across scenarios

    // Get adjacent hex coordinates for a given position
    const getNeighbors = (rowIndex: number, colIndex: number, rows: Array<{ count: number; offset: number }>): Array<{ row: number; col: number }> => {
        const neighbors: Array<{ row: number; col: number }> = [];
        const row = rows[rowIndex];
        if (!row) return neighbors;

        const currentOffset = row.offset;

        // Top-left and top-right neighbors
        if (rowIndex > 0) {
            const prevRow = rows[rowIndex - 1];
            if (prevRow) {
                const prevOffset = prevRow.offset;
                const offsetDiff = currentOffset - prevOffset;

                // Determine neighbor column indices based on offset difference
                // If current row is shifted right (larger offset), neighbors shift accordingly
                if (offsetDiff > 0) {
                    // Current row shifted right compared to previous row
                    // Top-left at same col, top-right at col+1
                    if (colIndex < prevRow.count) {
                        neighbors.push({ row: rowIndex - 1, col: colIndex });
                    }
                    if (colIndex + 1 < prevRow.count) {
                        neighbors.push({ row: rowIndex - 1, col: colIndex + 1 });
                    }
                } else if (offsetDiff < 0) {
                    // Current row shifted left compared to previous row
                    // Top-left at col-1, top-right at same col
                    if (colIndex > 0 && colIndex - 1 < prevRow.count) {
                        neighbors.push({ row: rowIndex - 1, col: colIndex - 1 });
                    }
                    if (colIndex < prevRow.count) {
                        neighbors.push({ row: rowIndex - 1, col: colIndex });
                    }
                } else {
                    // Same offset
                    // Top-left at col-1, top-right at col
                    if (colIndex > 0 && colIndex - 1 < prevRow.count) {
                        neighbors.push({ row: rowIndex - 1, col: colIndex - 1 });
                    }
                    if (colIndex < prevRow.count) {
                        neighbors.push({ row: rowIndex - 1, col: colIndex });
                    }
                }
            }
        }

        // Left neighbor (same row)
        if (colIndex > 0) {
            neighbors.push({ row: rowIndex, col: colIndex - 1 });
        }

        // Right neighbor (same row)
        if (colIndex + 1 < row.count) {
            neighbors.push({ row: rowIndex, col: colIndex + 1 });
        }

        // Bottom-left and bottom-right neighbors
        if (rowIndex + 1 < rows.length) {
            const nextRow = rows[rowIndex + 1];
            if (nextRow) {
                const nextOffset = nextRow.offset;
                const offsetDiff = currentOffset - nextOffset;

                if (offsetDiff > 0) {
                    // Current row shifted right compared to next row
                    // Bottom-left at col-1, bottom-right at same col
                    if (colIndex > 0 && colIndex - 1 < nextRow.count) {
                        neighbors.push({ row: rowIndex + 1, col: colIndex - 1 });
                    }
                    if (colIndex < nextRow.count) {
                        neighbors.push({ row: rowIndex + 1, col: colIndex });
                    }
                } else if (offsetDiff < 0) {
                    // Current row shifted left compared to next row
                    // Bottom-left at same col, bottom-right at col+1
                    if (colIndex < nextRow.count) {
                        neighbors.push({ row: rowIndex + 1, col: colIndex });
                    }
                    if (colIndex + 1 < nextRow.count) {
                        neighbors.push({ row: rowIndex + 1, col: colIndex + 1 });
                    }
                } else {
                    // Same offset
                    // Bottom-left at col, bottom-right at col+1
                    if (colIndex < nextRow.count) {
                        neighbors.push({ row: rowIndex + 1, col: colIndex });
                    }
                    if (colIndex + 1 < nextRow.count) {
                        neighbors.push({ row: rowIndex + 1, col: colIndex + 1 });
                    }
                }
            }
        }

        return neighbors;
    };

    // Get hex at specific position from hexes array
    const getHexAt = (rowIndex: number, colIndex: number, hexesArray: Hex[], rows: Array<{ count: number; offset: number }>): Hex | null => {
        let hexIndex = 0;
        for (let r = 0; r < rowIndex; r++) {
            hexIndex += rows[r]?.count || 0;
        }
        hexIndex += colIndex;
        return hexesArray[hexIndex] || null;
    };

    // Convert flat array index to 2D row/col coordinates
    const getRowColFromIndex = (
        index: number,
        rows: Array<{ count: number; offset: number }>
    ): { row: number; col: number } | null => {
        let currentIndex = 0;

        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const rowCount = rows[rowIndex]?.count || 0;
            if (currentIndex + rowCount > index) {
                return {
                    row: rowIndex,
                    col: index - currentIndex
                };
            }
            currentIndex += rowCount;
        }

        return null;
    };

    // Count adjacent resources of the same type
    const countAdjacentResources = (
        resourceType: ResourceType,
        rowIndex: number,
        colIndex: number,
        placedHexes: Hex[],
        rows: Array<{ count: number; offset: number }>
    ): number => {
        const neighbors = getNeighbors(rowIndex, colIndex, rows);
        let count = 0;
        neighbors.forEach(({ row, col }) => {
            const neighborHex = getHexAt(row, col, placedHexes, rows);
            if (neighborHex && neighborHex.resourceType === resourceType) {
                count++;
            }
        });
        return count;
    };

    // Check if placing a resource would create clumping (exceed max touching)
    const hasResourceClumping = (
        resourceType: ResourceType,
        rowIndex: number,
        colIndex: number,
        placedHexes: Hex[],
        rows: Array<{ count: number; offset: number }>,
        maxCount: number = 2
    ): boolean => {
        const adjacentCount = countAdjacentResources(resourceType, rowIndex, colIndex, placedHexes, rows);
        return adjacentCount > maxCount;
    };

    // Check if placing a 6 or 8 would create adjacency with another 6 or 8
    const hasHighNumberAdjacency = (
        number: number,
        rowIndex: number,
        colIndex: number,
        hexesArray: Hex[],
        rows: Array<{ count: number; offset: number }>
    ): boolean => {
        // Only check for 6s and 8s
        if (number !== 6 && number !== 8) {
            return false;
        }

        const neighbors = getNeighbors(rowIndex, colIndex, rows);

        for (const { row, col } of neighbors) {
            const neighborHex = getHexAt(row, col, hexesArray, rows);
            if (neighborHex?.number === 6 || neighborHex?.number === 8) {
                return true;
            }
        }

        return false;
    };

    // Assign numbers with constraint that 6s and 8s cannot be adjacent
    const assignNumbersWithConstraints = (
        hexesArray: Hex[],
        numbersArray: number[],
        rows: Array<{ count: number; offset: number }>,
        seed: number
    ): boolean => {
        // Create list of hexes that need numbers
        const hexesToNumber: Array<{ index: number }> = [];

        hexesArray.forEach((hex, index) => {
            if (hex.resourceType !== 'water' && hex.resourceType !== 'desert') {
                hexesToNumber.push({ index });
            }
        });

        // Assign numbers one by one, checking constraints
        let numberIndex = 0;

        for (const hexInfo of hexesToNumber) {
            const { index } = hexInfo;
            const coords = getRowColFromIndex(index, rows);

            if (!coords) {
                // Fallback if coordinates can't be determined
                hexesArray[index].number = numbersArray[numberIndex++];
                continue;
            }

            const { row, col } = coords;
            let assigned = false;

            // Try to assign the next number in sequence
            for (let attempt = 0; attempt < numbersArray.length - numberIndex; attempt++) {
                const numberToTry = numbersArray[numberIndex + attempt];
                hexesArray[index].number = numberToTry;

                // Check if this creates a violation
                const hasViolation = hasHighNumberAdjacency(numberToTry, row, col, hexesArray, rows);

                if (!hasViolation) {
                    // Successful assignment - swap this number to the front
                    if (attempt > 0) {
                        [numbersArray[numberIndex], numbersArray[numberIndex + attempt]] =
                            [numbersArray[numberIndex + attempt], numbersArray[numberIndex]];
                    }
                    numberIndex++;
                    assigned = true;
                    break;
                } else {
                    // Try next number
                    hexesArray[index].number = undefined;
                }
            }

            if (!assigned) {
                // Could not assign without violation - need to retry
                return false;
            }
        }

        return true;
    };

    // ========== SCENARIO CONFIGURATION SYSTEM ==========
    type ScenarioConfig = {
        layout: string[][]; // land/water layout
        placementRules?: (hexes: Hex[], resources: ResourceType[], seed: number, rows: Array<{ count: number; offset: number }>, counts: Partial<Record<ResourceType, number>>) => Hex[];
        zones?: {
            mainland?: { rows: number[] };
            islands?: { rows: number[] };
            channel?: { rows: number[] };
        };
    };


    // Heading for New Shores placement function
    const headingForNewShoresPlacement = (
        hexes: Hex[],
        resources: ResourceType[],
        seed: number,
        rows: Array<{ count: number; offset: number }>,
        counts: Partial<Record<ResourceType, number>>
    ): Hex[] => {
        const totalHexes = hexes.length;

        let alwaysWaterIndices: number[];
        let smallIslandIndices: number[];
        let bigIslandIndices: number[];

        if (playerCount === 3) {
            // 3-player layout: 4-5-6-7-6-5-4 = 37 hexes
            // Big island locations: 3-4, 7-9, 12-15, 19-21, 26-27 (14 hexes)
            bigIslandIndices = [3, 4, 7, 8, 9, 12, 13, 14, 15, 19, 20, 21, 26, 27];

            // Permanent water: 2,6,11,16,18,22,25,28,31-33 (11 hexes)
            alwaysWaterIndices = [2, 6, 11, 16, 18, 22, 25, 28, 31, 32, 33];

            // Small islands: remaining hexes (12 hexes)
            smallIslandIndices = [];
            for (let i = 1; i <= totalHexes; i++) {
                if (!alwaysWaterIndices.includes(i) && !bigIslandIndices.includes(i)) {
                    smallIslandIndices.push(i);
                }
            }

            // Big island: 14 hexes total (no desert - all get resources)
            // Small islands: 12 hexes total
        } else if (playerCount === 6) {
            // 6-player layout: 7-8-9-10-9-8-7 = 58 hexes
            // Big island: 3-5,10-13,18-22,27-32,37-41,46-49,54-56 (30 hexes)
            bigIslandIndices = [3, 4, 5, 10, 11, 12, 13, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 37, 38, 39, 40, 41, 46, 47, 48, 49, 54, 55, 56];

            // Permanent water: 2,6,9,14,17,23,25,26,33,34,36,42,45,50,53,57 (16 hexes)
            alwaysWaterIndices = [2, 6, 9, 14, 17, 23, 25, 26, 33, 34, 36, 42, 45, 50, 53, 57];

            // Small islands: remaining hexes (12 hexes)
            smallIslandIndices = [];
            for (let i = 1; i <= totalHexes; i++) {
                if (!alwaysWaterIndices.includes(i) && !bigIslandIndices.includes(i)) {
                    smallIslandIndices.push(i);
                }
            }
        } else {
            // 4-player layout: 5-6-7-8-7-6-5 = 44 hexes
            // Define permanent water hex indices (1-indexed): 2,7,13,19,21,26,29,33,36-39
            alwaysWaterIndices = [
                2,   // row 0, pos 1
                7,   // row 1, pos 1
                13,  // row 2, pos 1
                19,  // row 3, pos 0
                21,  // row 3, pos 2
                26,  // row 3, pos 7
                29,  // row 4, pos 2
                33,  // row 4, pos 6
                36, 37, 38, 39  // row 5: positions 2,3,4,5
            ];

            // Define small island zone (1-indexed): 1,6,12,20,27,28,34-35,40-44
            smallIslandIndices = [1, 6, 12, 20, 27, 28, 34, 35, 40, 41, 42, 43, 44];

            // Define big island zone (1-indexed): 3-5,8-11,14-18,22-25,30-32
            bigIslandIndices = [3, 4, 5, 8, 9, 10, 11, 14, 15, 16, 17, 18, 22, 23, 24, 25, 30, 31, 32];

            // Big island: 19 hexes = 1 desert + 18 resource hexes
            // Small islands: 9 land hexes = 2 gold + 7 resource hexes
        }

        const resourceTypes: ResourceType[] = ['forest', 'pasture', 'field', 'hill', 'mountain'];

        let bigIslandHexes: number;
        let smallIslandLandHexes: number;
        let goldCount: number;

        if (playerCount === 3) {
            // Big island: 14 hexes, all get resources (no desert)
            // Small islands: 12 hexes total
            bigIslandHexes = 14;
            goldCount = 2;
        } else if (playerCount === 6) {
            // 6-player: 30 big island hexes, 12 small island hexes
            bigIslandHexes = 30;
            goldCount = 3;
        } else {
            bigIslandHexes = 18; // 19 total - 1 desert
            smallIslandLandHexes = 7; // 9 land hexes - 2 gold
            goldCount = 2;
        }

        let bigIslandResources: ResourceType[] = [];
        let smallIslandResources: ResourceType[] = [];

        if (playerCount === 3) {
            // Big island: fixed distribution + 1 random from [hay, brick, wood]
            const randomChoices: ResourceType[] = ['field', 'hill', 'mountain']; // hay, brick, wood
            const chosenRandom = randomChoices[Math.floor(seededRandom(seed + 3000, randomChoices.length))];
            const remainingRandom = randomChoices.filter(choice => choice !== chosenRandom);

            bigIslandResources = [
                // Fixed: 4 sheep, 2 hay, 2 brick, 2 rock, 3 wood
                'pasture', 'pasture', 'pasture', 'pasture', // 4 sheep
                'field', 'field', // 2 hay
                'hill', 'hill', // 2 brick
                'mountain', 'mountain', // 2 rock
                'forest', 'forest', 'forest', // 3 wood
                chosenRandom // 1 random from remaining
            ];

            // Small islands: fixed + 2 remaining options from big island random
            smallIslandResources = [
                // Fixed: 2 gold, 1 hay, 1 brick, 1 rock, 1 sheep
                'gold', 'gold', // 2 gold
                'field', // 1 hay
                'hill', // 1 brick
                'mountain', // 1 rock
                'pasture', // 1 sheep
                // 2 remaining options from big island random
                remainingRandom[0], remainingRandom[1]
            ];
        } else if (playerCount === 6) {
            // 6-player big island: 2 desert, 5 rock, 5 brick, 6 sheep, 6 wood, 6 wheat
            bigIslandResources = [
                // 2 desert
                'desert', 'desert',
                // 5 rock
                'mountain', 'mountain', 'mountain', 'mountain', 'mountain',
                // 5 brick
                'hill', 'hill', 'hill', 'hill', 'hill',
                // 6 sheep
                'pasture', 'pasture', 'pasture', 'pasture', 'pasture', 'pasture',
                // 6 wood
                'forest', 'forest', 'forest', 'forest', 'forest', 'forest',
                // 6 wheat
                'field', 'field', 'field', 'field', 'field', 'field'
            ];

            // 6-player small islands: 2 water, 3 gold, 2 rock, 2 brick, 1 sheep, 1 wood, 1 wheat
            smallIslandResources = [
                // 3 gold
                'gold', 'gold', 'gold',
                // 2 rock
                'mountain', 'mountain',
                // 2 brick
                'hill', 'hill',
                // 1 sheep
                'pasture',
                // 1 wood
                'forest',
                // 1 wheat
                'field'
            ];
        } else {
            // 4-player logic
            // Step 1: Start with 3 of each resource for big island, 1 of each for small islands
            const bigIslandResourceCounts: { [key: string]: number } = {};
            const smallIslandResourceCounts: { [key: string]: number } = {};

            resourceTypes.forEach(resourceType => {
                bigIslandResourceCounts[resourceType] = 3;  // Base: 3 of each
                smallIslandResourceCounts[resourceType] = 1; // Base: 1 of each (ensures at least 1 on small islands)
            });

            // Step 2: Randomly select 3 resource types to get +1 on big island
            // The remaining 2 types get +1 on small islands
            const shuffledTypes = [...resourceTypes];
            for (let i = shuffledTypes.length - 1; i > 0; i--) {
                const j = Math.floor(seededRandom(seed + 5000, i) * (i + 1));
                [shuffledTypes[i], shuffledTypes[j]] = [shuffledTypes[j], shuffledTypes[i]];
            }

            // First 3 shuffled types get +1 on big island (total 4)
            // Last 2 shuffled types get +1 on small islands (total 2)
            for (let i = 0; i < 3; i++) {
                bigIslandResourceCounts[shuffledTypes[i]]++;
            }
            for (let i = 3; i < 5; i++) {
                smallIslandResourceCounts[shuffledTypes[i]]++;
            }

            // Step 3: Build the resource arrays for 4-player
            // Add desert to big island
            bigIslandResources.push('desert');

            // Add resources to big island
            resourceTypes.forEach(resourceType => {
                for (let i = 0; i < bigIslandResourceCounts[resourceType]; i++) {
                    bigIslandResources.push(resourceType);
                }
            });

            // Add 2 gold to small islands
            smallIslandResources.push('gold', 'gold');

            // Add resources to small islands
            resourceTypes.forEach(resourceType => {
                for (let i = 0; i < smallIslandResourceCounts[resourceType]; i++) {
                    smallIslandResources.push(resourceType);
                }
            });
        }

        // Randomly select some small island positions to be water
        const smallIslandWaterPositions: number[] = [];
        if (playerCount === 3) {
            // For 3-player, make 4 small island hexes water
            const shuffledSmallIslandIndices = [...smallIslandIndices];
            for (let i = shuffledSmallIslandIndices.length - 1; i > 0; i--) {
                const j = Math.floor(seededRandom(seed + 2000, i) * (i + 1));
                [shuffledSmallIslandIndices[i], shuffledSmallIslandIndices[j]] = [shuffledSmallIslandIndices[j], shuffledSmallIslandIndices[i]];
            }
            smallIslandWaterPositions.push(...shuffledSmallIslandIndices.slice(0, 4)); // 4 water tiles
        } else if (playerCount === 6) {
            // For 6-player, make 2 small island hexes water
            const shuffledSmallIslandIndices = [...smallIslandIndices];
            for (let i = shuffledSmallIslandIndices.length - 1; i > 0; i--) {
                const j = Math.floor(seededRandom(seed + 2000, i) * (i + 1));
                [shuffledSmallIslandIndices[i], shuffledSmallIslandIndices[j]] = [shuffledSmallIslandIndices[j], shuffledSmallIslandIndices[i]];
            }
            smallIslandWaterPositions.push(...shuffledSmallIslandIndices.slice(0, 2)); // 2 water tiles
        } else {
            // For 4-player, make 4 small island positions water
            const shuffledSmallIslandIndices = [...smallIslandIndices];
            for (let i = shuffledSmallIslandIndices.length - 1; i > 0; i--) {
                const j = Math.floor(seededRandom(seed + 2000, i) * (i + 1));
                [shuffledSmallIslandIndices[i], shuffledSmallIslandIndices[j]] = [shuffledSmallIslandIndices[j], shuffledSmallIslandIndices[i]];
            }
            smallIslandWaterPositions.push(...shuffledSmallIslandIndices.slice(0, 4));
        }

        // Shuffle both resource pools
        for (let i = bigIslandResources.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom(seed, i) * (i + 1));
            [bigIslandResources[i], bigIslandResources[j]] = [bigIslandResources[j], bigIslandResources[i]];
        }

        for (let i = smallIslandResources.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom(seed + 1000, i) * (i + 1));
            [smallIslandResources[i], smallIslandResources[j]] = [smallIslandResources[j], smallIslandResources[i]];
        }

        // Assign resources to hexes
        let smallIslandResourceIndex = 0;
        let bigIslandResourceIndex = 0;

        hexes.forEach((hex, index) => {
            const hexNumber = index + 1; // 1-indexed

            if (alwaysWaterIndices.includes(hexNumber)) {
                // Permanent water
                hex.resourceType = 'water';
            } else if (smallIslandIndices.includes(hexNumber)) {
                // Small island zone
                if (smallIslandWaterPositions.includes(hexNumber)) {
                    // This position is randomly selected to be water
                    hex.resourceType = 'water';
                } else if (smallIslandResourceIndex < smallIslandResources.length) {
                    // Assign land resources to remaining positions
                    hex.resourceType = smallIslandResources[smallIslandResourceIndex++];
                } else {
                    hex.resourceType = 'desert'; // fallback (shouldn't happen)
                }
            } else if (bigIslandIndices.includes(hexNumber)) {
                // Big island zone - assign resources
                if (bigIslandResourceIndex < bigIslandResources.length) {
                    hex.resourceType = bigIslandResources[bigIslandResourceIndex++];
                } else {
                    hex.resourceType = 'desert'; // fallback (shouldn't happen)
                }
            } else {
                // Shouldn't happen, but fallback
                hex.resourceType = 'desert';
            }
        });

        return hexes;
    };

    // 4 Islands placement function
    const fourIslandsPlacement = (
        hexes: Hex[],
        landResources: ResourceType[],
        seed: number,
        rows: Array<{ count: number; offset: number }>,
        counts: Partial<Record<ResourceType, number>>
    ): Hex[] => {
        // Water template configurations
        const waterTemplates = [
            {
                central: [16, 17, 18, 19, 21, 22],
                perimeter: [[2, 3], [7], [12, 13], [20], [25, 26], [31], [35, 36]]
            },
            {
                central: [16, 17, 18, 12, 13, 20, 21, 22],
                perimeter: [[2, 3], [7], [12, 13], [19], [25, 26], [31], [35, 36]]
            },
            {
                central: [16, 17, 18, 25, 26, 20, 21, 22],
                perimeter: [[2, 3], [7], [12, 13], [19], [25, 26], [31], [35, 36]]
            },
            {
                central: [16, 17, 24, 25, 26, 20, 21, 22],
                perimeter: [[2, 3], [7], [12, 13], [19], [25, 26], [31], [35, 36]]
            },
            {
                central: [16, 17, 11, 12, 13, 20, 21, 22],
                perimeter: [[2, 3], [7], [12, 13], [19], [25, 26], [31], [35, 36]]
            },
            {
                central: [16, 17, 18, 12, 13, 14, 21, 22],
                perimeter: [[2, 3], [7], [12, 13], [19], [25, 26], [31], [35, 36]]
            },
            {
                central: [16, 17, 18, 25, 26, 21, 22, 20],
                perimeter: [[2, 3], [7], [12, 13], [19], [25, 26], [31], [35, 36]]
            }, {
                central: [16, 17, 18, 25, 26, 21, 22, 20],
                perimeter: [[2, 3], [7], [12, 13], [25, 26], [31], [35, 36]]
            },
            {
                central: [16, 17, 24, 25, 26, 20, 21, 22],
                perimeter: [[2, 3], [7], [12, 13], [18], [25, 26], [31], [35, 36]]
            },

        ];

        // Select random template
        const templateIndex = Math.floor(seededRandom(seed + 5000, 0) * waterTemplates.length);
        const template = waterTemplates[templateIndex];

        // Build water hex indices (1-indexed, will convert to 0-indexed)
        const waterIndices: number[] = [...template.central];

        // For each perimeter group, select random option
        template.perimeter.forEach((options, idx) => {
            if (options.length === 1) {
                waterIndices.push(options[0]);
            } else {
                const choice = Math.floor(seededRandom(seed + 6000, idx) * options.length);
                waterIndices.push(options[choice]);
            }
        });

        // Remove duplicates and convert to 0-indexed
        const uniqueWaterIndices = Array.from(new Set(waterIndices)).map(i => i - 1);

        // Build resource pool: 5 sheep, 5 wheat, 5 wood, 4 brick, 4 rock
        const resourcePool: ResourceType[] = [
            'pasture', 'pasture', 'pasture', 'pasture', 'pasture', // 5 sheep
            'field', 'field', 'field', 'field', 'field',           // 5 wheat
            'forest', 'forest', 'forest', 'forest', 'forest',      // 5 wood
            'hill', 'hill', 'hill', 'hill',                        // 4 brick
            'mountain', 'mountain', 'mountain', 'mountain',        // 4 rock
        ];

        // Shuffle resource pool
        for (let i = resourcePool.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom(seed + 7000, i) * (i + 1));
            [resourcePool[i], resourcePool[j]] = [resourcePool[j], resourcePool[i]];
        }

        // Assign resources to hexes
        let resourceIndex = 0;
        hexes.forEach((hex, index) => {
            if (uniqueWaterIndices.includes(index)) {
                // This hex is water
                hex.resourceType = 'water';
            } else {
                // This hex gets a resource (or water if we run out)
                if (resourceIndex < resourcePool.length) {
                    hex.resourceType = resourcePool[resourceIndex++];
                } else {
                    // Extra hexes become water
                    hex.resourceType = 'water';
                }
            }
        });

        return hexes;
    };

    const scenarioConfigs: Record<ScenarioType, ScenarioConfig> = {
        '4-islands': {
            layout: [
                // 4-player only for now: 4-5-6-7-6-5-4
                ['land', 'land', 'land', 'land'],
                ['land', 'land', 'land', 'land', 'land'],
                ['land', 'land', 'land', 'land', 'land', 'land'],
                ['land', 'land', 'land', 'land', 'land', 'land', 'land'],
                ['land', 'land', 'land', 'land', 'land', 'land'],
                ['land', 'land', 'land', 'land', 'land'],
                ['land', 'land', 'land', 'land'],
            ],
            zones: {},
            placementRules: fourIslandsPlacement,
        },
        'heading-for-new-shores': {
            layout: playerCount === 3 ? [
                // 3-player: row 0: 4 hexes
                ['land', 'land', 'land', 'land'],
                // row 1: 5 hexes
                ['land', 'land', 'land', 'land', 'land'],
                // row 2: 6 hexes
                ['land', 'land', 'land', 'land', 'land', 'land'],
                // row 3: 7 hexes
                ['land', 'land', 'land', 'land', 'land', 'land', 'land'],
                // row 4: 6 hexes
                ['land', 'land', 'land', 'land', 'land', 'land'],
                // row 5: 5 hexes
                ['land', 'land', 'land', 'land', 'land'],
                // row 6: 4 hexes
                ['land', 'land', 'land', 'land'],
            ] : playerCount === 6 ? [
                // 6-player: row 0: 7 hexes
                ['land', 'land', 'land', 'land', 'land', 'land', 'land'],
                // row 1: 8 hexes
                ['land', 'land', 'land', 'land', 'land', 'land', 'land', 'land'],
                // row 2: 9 hexes
                ['land', 'land', 'land', 'land', 'land', 'land', 'land', 'land', 'land'],
                // row 3: 10 hexes
                ['land', 'land', 'land', 'land', 'land', 'land', 'land', 'land', 'land', 'land'],
                // row 4: 9 hexes
                ['land', 'land', 'land', 'land', 'land', 'land', 'land', 'land', 'land'],
                // row 5: 8 hexes
                ['land', 'land', 'land', 'land', 'land', 'land', 'land', 'land'],
                // row 6: 7 hexes
                ['land', 'land', 'land', 'land', 'land', 'land', 'land'],
            ] : [
                // 4-player: row 0: 5 hexes
                ['land', 'land', 'land', 'land', 'land'],
                // row 1: 6 hexes
                ['land', 'land', 'land', 'land', 'land', 'land'],
                // row 2: 7 hexes
                ['land', 'land', 'land', 'land', 'land', 'land', 'land'],
                // row 3: 8 hexes
                ['land', 'land', 'land', 'land', 'land', 'land', 'land', 'land'],
                // row 4: 7 hexes
                ['land', 'land', 'land', 'land', 'land', 'land', 'land'],
                // row 5: 6 hexes
                ['land', 'land', 'land', 'land', 'land', 'land'],
                // row 6: 5 hexes
                ['land', 'land', 'land', 'land', 'land'],
            ],
            zones: {},
            placementRules: headingForNewShoresPlacement,
        },
    };

    // Generate all hex positions with randomized resources and numbers
    const hexes = useMemo(() => {
        const hexesArray: Hex[] = [];
        const verticalOffset = expansion === 'classic' && playerCount === '5-6' ? -0.5 * verticalSpacing : 0;
        const counts = getResourceCounts();

        if (expansion === 'seafarers') {
            // Get scenario config if available
            const scenarioConfig = scenarioConfigs[scenario];
            const seafarersLayout = scenarioConfig?.layout;

            // First, create hexes with positions and initial resource types from layout
            rows.forEach((row: { count: number; offset: number }, rowIndex: number) => {
                const startX = row.offset * hexWidth;
                const rowLayout = seafarersLayout[rowIndex] || [];

                for (let colIndex = 0; colIndex < row.count; colIndex++) {
                    const hexType = rowLayout[colIndex] || 'water';
                    const isWater = hexType === 'water';

                    hexesArray.push({
                        id: `hex-${rowIndex}-${colIndex}`,
                        x: startX + colIndex * hexWidth,
                        y: rowIndex * verticalSpacing + verticalOffset,
                        resourceType: isWater ? 'water' : 'forest', // Temporary placeholder
                        number: undefined,
                    });
                }
            });

            // Create array of land resources (excluding water)
            const landResources: ResourceType[] = [];
            (Object.entries(counts) as Array<[ResourceType, number]>).forEach(([resource, count]) => {
                if (resource !== 'water') {
                    for (let i = 0; i < count; i++) {
                        landResources.push(resource as ResourceType);
                    }
                }
            });

            // Apply scenario-specific placement rules if available
            if (scenarioConfig?.placementRules) {
                scenarioConfig.placementRules(hexesArray, landResources, randomSeed, rows, counts);
            } else {
                // Fallback to simple random placement
                for (let i = landResources.length - 1; i > 0; i--) {
                    const j = Math.floor(seededRandom(randomSeed, i) * (i + 1));
                    [landResources[i], landResources[j]] = [landResources[j], landResources[i]];
                }

                let landResourceIndex = 0;
                hexesArray.forEach(hex => {
                    if (hex.resourceType !== 'water') {
                        hex.resourceType = landResources[landResourceIndex++] || 'desert';
                    }
                });
            }

            // Create array of numbers for land hexes that get them
            const numberDistribution = getNumberDistribution();
            const numbersArray: number[] = [];
            Object.entries(numberDistribution).forEach(([num, count]) => {
                for (let i = 0; i < count; i++) {
                    numbersArray.push(parseInt(num));
                }
            });

            // Assign numbers with retry logic if constraint fails
            let success = false;
            let retryCount = 0;
            const maxRetries = 100;

            while (!success && retryCount < maxRetries) {
                // Shuffle numbers using seeded random (with retry offset)
                const shuffleSeed = randomSeed + 1000 + retryCount;
                for (let i = numbersArray.length - 1; i > 0; i--) {
                    const j = Math.floor(seededRandom(shuffleSeed, i) * (i + 1));
                    [numbersArray[i], numbersArray[j]] = [numbersArray[j], numbersArray[i]];
                }

                // Try to assign numbers with constraints (no adjacent 6s/8s)
                success = assignNumbersWithConstraints(hexesArray, numbersArray, rows, shuffleSeed);

                if (!success) {
                    // Clear all numbers and retry with different shuffle
                    hexesArray.forEach(hex => {
                        if (hex.resourceType !== 'water' && hex.resourceType !== 'desert') {
                            hex.number = undefined;
                        }
                    });
                    retryCount++;
                }
            }
        } else {
            // Classic Catan logic
            // Create array of resources in the correct quantities
            const resourcesArray: ResourceType[] = [];
            (Object.entries(counts) as Array<[ResourceType, number]>).forEach(([resource, count]) => {
                for (let i = 0; i < count; i++) {
                    resourcesArray.push(resource);
                }
            });

            // Shuffle resources using seeded random
            for (let i = resourcesArray.length - 1; i > 0; i--) {
                const j = Math.floor(seededRandom(randomSeed, i) * (i + 1));
                [resourcesArray[i], resourcesArray[j]] = [resourcesArray[j], resourcesArray[i]];
            }

            // Create array of numbers (excluding 7 and excluding one for desert)
            const numberDistribution = getNumberDistribution();
            const numbersArray: number[] = [];
            Object.entries(numberDistribution).forEach(([num, count]) => {
                for (let i = 0; i < count; i++) {
                    numbersArray.push(parseInt(num));
                }
            });

            // Assign resources and numbers to hex positions
            let resourceIndex = 0;
            rows.forEach((row: { count: number; offset: number }, rowIndex: number) => {
                const startX = row.offset * hexWidth;
                for (let colIndex = 0; colIndex < row.count; colIndex++) {
                    const resource = resourcesArray[resourceIndex] || 'desert';
                    hexesArray.push({
                        id: `hex-${rowIndex}-${colIndex}`,
                        x: startX + colIndex * hexWidth,
                        y: rowIndex * verticalSpacing + verticalOffset,
                        resourceType: resource,
                        number: undefined, // Will be assigned with constraints
                    });
                    resourceIndex++;
                }
            });

            // Assign numbers with retry logic if constraint fails
            let success = false;
            let retryCount = 0;
            const maxRetries = 100;

            while (!success && retryCount < maxRetries) {
                // Shuffle numbers using seeded random (with retry offset)
                const shuffleSeed = randomSeed + 1000 + retryCount;
                for (let i = numbersArray.length - 1; i > 0; i--) {
                    const j = Math.floor(seededRandom(shuffleSeed, i) * (i + 1));
                    [numbersArray[i], numbersArray[j]] = [numbersArray[j], numbersArray[i]];
                }

                // Try to assign numbers with constraints (no adjacent 6s/8s)
                success = assignNumbersWithConstraints(hexesArray, numbersArray, rows, shuffleSeed);

                if (!success) {
                    // Clear all numbers and retry with different shuffle
                    hexesArray.forEach(hex => {
                        if (hex.resourceType !== 'water' && hex.resourceType !== 'desert') {
                            hex.number = undefined;
                        }
                    });
                    retryCount++;
                }
            }
        }

        return hexesArray;
    }, [randomSeed, playerCount, expansion]);

    // Calculate SVG points for a flat-top hexagon
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

    // Calculate hexagon points for CSS clip-path (relative to element, using percentages)
    const getHexagonClipPath = (): string => {
        const w = hexWidth / 2;
        const h = hexHeight / 2;
        const centerX = hexWidth / 2;
        const centerY = hexHeight / 2;

        const points = [
            [centerX, centerY - h],           // top
            [centerX + w, centerY - h / 2],   // top-right
            [centerX + w, centerY + h / 2],   // bottom-right
            [centerX, centerY + h],           // bottom
            [centerX - w, centerY + h / 2],   // bottom-left
            [centerX - w, centerY - h / 2],   // top-left
        ];

        // Convert to percentages for CSS clip-path
        return points.map(([x, y]) => `${(x / hexWidth) * 100}% ${(y / hexHeight) * 100}%`).join(', ');
    };

    // Calculate outer hexagon points (slightly larger for outer border)
    const getOuterHexagonPoints = (centerX: number, centerY: number, offset: number = 3): string => {
        const w = hexWidth / 2 + offset;
        const h = hexHeight / 2 + offset;

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

    // Calculate total board dimensions
    const getBoardDimensions = () => {
        if (expansion === 'seafarers') {
            if (playerCount === 3) {
                // 3-player "Heading for New Shores": 4-5-6-7-6-5-4 rows, max 7 hexes wide
                return {
                    width: 7 * hexWidth, // max row width
                    height: 7 * verticalSpacing + hexHeight, // 7 rows
                };
            } else if (playerCount === 6) {
                // 6-player "Heading for New Shores": 7-8-9-10-9-8-7 rows, max 10 hexes wide
                return {
                    width: 10 * hexWidth, // max row width
                    height: 7 * verticalSpacing + hexHeight, // 7 rows
                };
            } else {
                // 4-player "Heading for New Shores": 5-6-7-8-7-6-5 rows, max 8 hexes wide
                return {
                    width: 8 * hexWidth, // max row width
                    height: 7 * verticalSpacing + hexHeight, // 7 rows
                };
            }
        } else {
            return {
                width: 5 * hexWidth,
                height: 4 * verticalSpacing + hexHeight,
            };
        }
    };
    const boardDimensions = getBoardDimensions();
    const boardWidth = boardDimensions.width;
    const boardHeight = boardDimensions.height;

    // Helper to get vertices for hex at row/col
    const getHexVerticesAt = (rowIdx: number, colIdx: number) => {
        // Bounds checking
        if (rowIdx < 0 || rowIdx >= rows.length || colIdx < 0 || colIdx >= rows[rowIdx]?.count) {
            throw new Error(`Invalid hex coordinates: row ${rowIdx}, col ${colIdx}`);
        }

        let hexIndex = 0;
        for (let r = 0; r < rowIdx; r++) {
            hexIndex += rows[r]?.count || 0;
        }
        hexIndex += colIdx;
        const hex = hexes[hexIndex];

        if (!hex) {
            throw new Error(`Hex not found at index ${hexIndex} for coordinates (${rowIdx}, ${colIdx})`);
        }

        const w = hexWidth / 2;
        const h = hexHeight / 2;
        const centerX = hexWidth / 2 + hex.x;
        const centerY = hexHeight / 2 + hex.y;

        return [
            { x: centerX, y: centerY - h },           // 0: top
            { x: centerX + w, y: centerY - h / 2 },   // 1: top-right
            { x: centerX + w, y: centerY + h / 2 },   // 2: bottom-right
            { x: centerX, y: centerY + h },           // 3: bottom
            { x: centerX - w, y: centerY + h / 2 },   // 4: bottom-left
            { x: centerX - w, y: centerY - h / 2 },   // 5: top-left
        ];
    };

    // Helper function to build 5-6 player perimeter
    const build56Perimeter = () => {
        const pts: { x: number; y: number }[] = [];
        // Row structure: [4, 5, 6, 6, 5, 4]
        // Start at top-left and trace clockwise

        // TOP EDGE - row 0 (4 hexes), left to right
        pts.push(getHexVerticesAt(0, 0)[5]); // v5 top-left of hex 0,0
        pts.push(getHexVerticesAt(0, 0)[0]); // v0 top
        pts.push(getHexVerticesAt(0, 0)[1]); // v1 top-right
        pts.push(getHexVerticesAt(0, 1)[0]); // v0 top of hex 0,1
        pts.push(getHexVerticesAt(0, 1)[1]); // v1 top-right
        pts.push(getHexVerticesAt(0, 2)[0]); // v0 top of hex 0,2
        pts.push(getHexVerticesAt(0, 2)[1]); // v1 top-right
        pts.push(getHexVerticesAt(0, 3)[0]); // v0 top of hex 0,3
        pts.push(getHexVerticesAt(0, 3)[1]); // v1 top-right
        pts.push(getHexVerticesAt(0, 3)[2]); // v2 bottom-right (rightmost point)

        // RIGHT EDGE - going down
        // From row 0 to row 1: hex (1,4) is to the right
        pts.push(getHexVerticesAt(1, 4)[1]); // v1 top-right of (1,4)
        pts.push(getHexVerticesAt(1, 4)[2]); // v2 bottom-right of (1,4)

        // From row 1 to row 2: hex (2,5)
        pts.push(getHexVerticesAt(2, 5)[1]); // v1 top-right of (2,5)
        pts.push(getHexVerticesAt(2, 5)[2]); // v2 bottom-right of (2,5)
        pts.push(getHexVerticesAt(2, 5)[3]); // v3 bottom point of (2,5)

        // Row 3 is same width, continue from (3,5)
        pts.push(getHexVerticesAt(3, 5)[2]); // v2 bottom-right of (3,5)
        pts.push(getHexVerticesAt(3, 5)[3]); // v3 bottom point of (3,5)

        // From row 3 to row 4: hex (4,4)
        pts.push(getHexVerticesAt(4, 4)[2]); // v2 bottom-right of (4,4)
        pts.push(getHexVerticesAt(4, 4)[3]); // v3 bottom point of (4,4)

        // From row 4 to row 5: hex (5,3)
        pts.push(getHexVerticesAt(5, 3)[2]); // v2 bottom-right of (5,3)
        pts.push(getHexVerticesAt(5, 3)[3]); // v3 bottom point of (5,3)

        // BOTTOM EDGE - row 5 (4 hexes), right to left
        pts.push(getHexVerticesAt(5, 3)[4]); // v4 bottom-left of (5,3)
        pts.push(getHexVerticesAt(5, 2)[3]); // v3 bottom point of (5,2)
        pts.push(getHexVerticesAt(5, 2)[4]); // v4 bottom-left of (5,2)
        pts.push(getHexVerticesAt(5, 1)[3]); // v3 bottom point of (5,1)
        pts.push(getHexVerticesAt(5, 1)[4]); // v4 bottom-left of (5,1)
        pts.push(getHexVerticesAt(5, 0)[3]); // v3 bottom point of (5,0)
        pts.push(getHexVerticesAt(5, 0)[4]); // v4 bottom-left of (5,0)
        pts.push(getHexVerticesAt(5, 0)[5]); // v5 leftmost point of (5,0)

        // LEFT EDGE - going up
        // From row 5 to row 4: hex (4,0)
        pts.push(getHexVerticesAt(4, 0)[4]); // v4 bottom-left of (4,0)
        pts.push(getHexVerticesAt(4, 0)[5]); // v5 top-left of (4,0)

        // From row 4 to row 3: hex (3,0)
        pts.push(getHexVerticesAt(3, 0)[4]); // v4 bottom-left of (3,0)
        pts.push(getHexVerticesAt(3, 0)[5]); // v5 top-left of (3,0)
        pts.push(getHexVerticesAt(3, 0)[0]); // v0 top point of (3,0)

        // From row 3 to row 2: hex (2,0)
        pts.push(getHexVerticesAt(2, 0)[5]); // v5 top-left of (2,0)
        pts.push(getHexVerticesAt(2, 0)[0]); // v0 top point of (2,0)

        // From row 2 to row 1: hex (1,0)
        pts.push(getHexVerticesAt(1, 0)[4]); // v4 bottom-left of (1,0)
        pts.push(getHexVerticesAt(1, 0)[5]); // v5 top-left of (1,0)
        pts.push(getHexVerticesAt(0, 0)[4]); // v4 bottom-left of (1,0)
        return pts;
    };

    // Build big island perimeter for seafarers
    const buildBigIslandPerimeter = useMemo(() => {
        const points: { x: number; y: number }[] = [];

        // Early return if hexes aren't loaded yet
        if (!hexes || hexes.length === 0) {
            return points;
        }

        // Get big island hex indices based on player count
        let bigIslandHexes: number[];
        if (playerCount === 3) {
            bigIslandHexes = [3, 4, 7, 8, 9, 12, 13, 14, 15, 19, 20, 21, 26, 27];
        } else {
            bigIslandHexes = [3, 4, 5, 8, 9, 10, 11, 14, 15, 16, 17, 18, 22, 23, 24, 25, 30, 31, 32];
        }

        // Convert hex indices to row/col positions
        const bigIslandPositions: Array<{ row: number, col: number }> = [];
        let currentIndex = 0;
        for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
            for (let colIdx = 0; colIdx < rows[rowIdx].count; colIdx++) {
                currentIndex++;
                if (bigIslandHexes.includes(currentIndex)) {
                    bigIslandPositions.push({ row: rowIdx, col: colIdx });
                }
            }
        }

        // Find perimeter edges - simplified approach: trace outer edges manually
        // This is a manual tracing of the big island perimeter
        if (playerCount === 3) {
            // 3-player big island perimeter (manual trace)
            // Start at top-left of hex (0,2) and trace clockwise
            const vertexCalls = [
                [0, 2, 5], // v5 top-left of (0,2)
                [0, 2, 0], // v0 top
                [0, 2, 1], // v1 top-right
                [0, 3, 0], // v0 top of (0,3)
                [0, 3, 1], // v1 top-right
                [0, 3, 2], // v2 bottom-right
                [1, 4, 1], // v1 top-right of (1,4)
                [1, 4, 2], // v2 bottom-right
                [2, 5, 1], // v1 top-right of (2,5)
                [2, 5, 2], // v2 bottom-right
                [2, 5, 3], // v3 bottom
                [3, 5, 2], // v2 bottom-right of (3,6)
                [3, 5, 3], // v3 bottom
                //[4, 5, 2], // v2 bottom-right of (4,5)
                //[4, 5, 3], // v3 bottom
                [4, 5, 4], // v4 bottom-left
                [4, 4, 3],
                [4, 4, 4],
                [4, 3, 3], // v3 bottom of (4,3)
                [4, 3, 4], // v4 bottom-left
                [4, 3, 5], // v5 top-left
                [3, 3, 4], // v4 bottom-left of (3,2)
                [3, 3, 5], // v5 top-left
                [3, 2, 0], // v0 top
                [2, 2, 5], // v5 top-left of (2,1)
                [2, 2, 0], // v0 top

                [1, 2, 5], // v4 bottom-left
                [0, 2, 4], // v4 bottom-left back to start
            ];

            // Add vertices, skipping any that cause errors
            vertexCalls.forEach(([row, col, vertexIndex]) => {
                try {
                    const vertices = getHexVerticesAt(row, col);
                    points.push(vertices[vertexIndex]);
                } catch (error) {
                    // Skip invalid coordinates
                    console.warn(`Skipping invalid big island border vertex at (${row}, ${col})[${vertexIndex}]`);
                }
            });
        } else if (playerCount === 6) {
            // 6-player big island perimeter (manual trace)
            // Island spans rows 0-6, columns roughly 2-8
            // Start at top-left (0,2) and trace clockwise
            const vertexCalls = [
                // Top edge: (0,2) -> (0,3) -> (0,4)
                [0, 2, 5], // v5 top-left of (0,2)
                [0, 2, 0], // v0 top
                [0, 2, 1], // v1 top-right
                [0, 3, 0], // v0 top of (0,3)
                [0, 3, 1], // v1 top-right
                [0, 4, 0], // v0 top of (0,4)
                [0, 4, 1], // v1 top-right
                [0, 4, 2], // v2 bottom-right

                // Right side down: (1,6) -> (2,7) -> (3,8)
                [1, 5, 1], // v1 top-right of (1,6)
                [1, 5, 2], // v2 bottom-right
                [2, 6, 1], // v1 top-right of (2,7)
                [2, 6, 2], // v2 bottom-right
                [3, 7, 1], // v1 top-right of (3,8)
                [3, 7, 2], // v2 bottom-right
                [3, 7, 3], // v3 bottom

                // Bottom edge: (4,7) -> (4,6) -> (4,5) -> (4,4)
                [4, 7, 4], // v3 bottom of (4,7) .  15
                //[4, 7, 5], // v4 bottom-left
                [4, 6, 3], // v3 bottom of (4,6)
                [5, 5, 2], // v4 bottom-left
                [5, 5, 3], // v3 bottom of (4,5)
                [6, 4, 2], // v4 bottom-left
                [6, 4, 3], // v3 bottom of (4,4)
                [6, 4, 4], // v4 bottom-left
                [6, 3, 3], // v5 top-left
                [6, 3, 4], // v4 bottom-left
                [6, 2, 3], // v5 top-left
                [6, 2, 4], // v4 bottom-left

                [6, 2, 5],
                [5, 2, 4],
                [5, 2, 5],

                [4, 2, 4],
                [4, 2, 5],
                [3, 2, 4],
                [3, 2, 5],
                [2, 2, 4],
                [2, 2, 5],
                [1, 2, 4],
                [1, 2, 5],
                [0, 2, 4],
            ];

            // Add vertices, skipping any that cause errors
            vertexCalls.forEach(([row, col, vertexIndex]) => {
                try {
                    const vertices = getHexVerticesAt(row, col);
                    points.push(vertices[vertexIndex]);
                } catch (error) {
                    // Skip invalid coordinates
                    console.warn(`Skipping invalid big island border vertex at (${row}, ${col})[${vertexIndex}]`);
                }
            });
        } else {
            // 4-player big island perimeter (manual trace)
            // Start at top-left of hex (0,2) and trace clockwise
            const vertexCalls = [
                [0, 2, 5], // v5 top-left of (0,2)
                [0, 2, 0], // v0 top
                [0, 2, 1], // v1 top-right
                [0, 3, 0], // v0 top of (0,3)
                [0, 3, 1], // v1 top-right
                [0, 4, 0], // v0 top of (0,4)
                [0, 4, 1], // v1 top-right
                [0, 4, 2], // v2 bottom-right
                [1, 5, 1], // v1 top-right of (1,5)
                [1, 5, 2], // v2 bottom-right
                [2, 6, 1], // v1 top-right of (2,6)
                [2, 6, 2], // v2 bottom-right
                [2, 6, 3], // v3 bottom
                //[3, 7, 2], // v2 bottom-right of (3,7)
                [3, 7, 4], // v3 bottom
                //[4, 6, 2], // v2 bottom-right of (4,6)
                [3, 6, 3], // v3 bottom
                [4, 6, 4], // v4 bottom-left
                [5, 6, 3], // v3 bottom of (5,4)
                [4, 5, 3], // v4 bottom-left
                [4, 4, 2], // v5 top-left
                [4, 4, 3], // v4 bottom-left of (5,3)
                //[5, 3, 5], // v5 top-left
                [4, 3, 2], // v0 top
                [4, 3, 3], // v5 top-left of (4,2)
                [4, 3, 4], // v0 top
                [4, 3, 5],
                [3, 3, 4], // v5 top-left of (3,1)
                [3, 3, 5], // v0 top
                [2, 2, 4], // v5 top-left of (2,0)
                [2, 2, 5], // v0 top
                [2, 2, 0], // v5 top-left of (1,0)
                [1, 2, 5], // v4 bottom-left
                [0, 2, 4], // v4 bottom-left back to start
            ];

            // Add vertices, skipping any that cause errors
            vertexCalls.forEach(([row, col, vertexIndex]) => {
                try {
                    const vertices = getHexVerticesAt(row, col);
                    points.push(vertices[vertexIndex]);
                } catch (error) {
                    // Skip invalid coordinates
                    console.warn(`Skipping invalid big island border vertex at (${row}, ${col})[${vertexIndex}]`);
                }
            });
        }

        return points;
    }, [hexes, rows, playerCount, hexWidth, hexHeight]);

    // Collect all outer perimeter points
    const perimeterPoints = useMemo(() => {
        const points: { x: number; y: number }[] = [];

        if (playerCount === 4) {
            // 4-player board: rows [3, 4, 5, 4, 3]

            // TOP EDGE (row 0)
            points.push(getHexVerticesAt(0, 0)[5]); // v5
            points.push(getHexVerticesAt(0, 0)[0]); // v0
            points.push(getHexVerticesAt(0, 0)[1]); // v1 - connection to hex 1
            points.push(getHexVerticesAt(0, 1)[0]); // v0
            points.push(getHexVerticesAt(0, 1)[1]); // v1 - connection to hex 2
            points.push(getHexVerticesAt(0, 2)[0]); // v0
            points.push(getHexVerticesAt(0, 2)[1]); // v1
            points.push(getHexVerticesAt(0, 2)[2]); // v2

            // UPPER-RIGHT (transitioning from row 0→1→2)
            points.push(getHexVerticesAt(1, 3)[1]); // v1
            points.push(getHexVerticesAt(1, 3)[2]); // v2
            //points.push(getHexVerticesAt(1, 3)[3]); // v3 - connection from row 1 to row 2 . this one is a mistake and is in the middle
            points.push(getHexVerticesAt(2, 4)[1]); // v1
            points.push(getHexVerticesAt(2, 4)[2]); // v2

            // RIGHT VERTEX (bottom-most right point)
            points.push(getHexVerticesAt(2, 4)[3]); // v3

            // LOWER-RIGHT (transitioning from row 2→3→4)
            points.push(getHexVerticesAt(3, 3)[2]); // v2
            points.push(getHexVerticesAt(3, 3)[3]); // v3
            points.push(getHexVerticesAt(4, 2)[2]); // v2
            points.push(getHexVerticesAt(4, 2)[3]); // v3

            // BOTTOM EDGE (row 4)
            points.push(getHexVerticesAt(4, 2)[4]); // v4
            points.push(getHexVerticesAt(4, 1)[3]); // v3
            points.push(getHexVerticesAt(4, 1)[4]); // v4
            points.push(getHexVerticesAt(4, 0)[3]); // v3
            points.push(getHexVerticesAt(4, 0)[4]); // v4
            points.push(getHexVerticesAt(4, 0)[5]); // v5

            // LOWER-LEFT (transitioning from row 4→3→2)
            points.push(getHexVerticesAt(3, 0)[4]); // v4
            points.push(getHexVerticesAt(3, 0)[5]); // v5
            points.push(getHexVerticesAt(2, 0)[4]); // v4
            points.push(getHexVerticesAt(2, 0)[5]); // v5

            // LEFT VERTEX (top-most left point)
            points.push(getHexVerticesAt(2, 0)[0]); // v0

            // UPPER-LEFT (transitioning from row 2→1→0)
            points.push(getHexVerticesAt(1, 0)[5]); // v5
            //points.push(getHexVerticesAt(1, 0)[4]); // v4 - connection back to row 0
            points.push(getHexVerticesAt(0, 0)[4]); // v4 - connection back to row 0

        } else if (playerCount === '5-6') {
            // 5-6 player board: use dedicated perimeter builder
            return build56Perimeter();
        }

        return points;
    }, [hexes, rows, playerCount, hexWidth, hexHeight]);

    // Generate randomized port assignments for big island
    const generateBigIslandPortAssignments = useMemo(() => {
        const seededRandom = (seed: number) => {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };

        let seed = randomSeed + 1000; // Different seed than classic ports
        let portTypes: string[] = [];

        if (playerCount === 3) {
            // 3-player: one brick, sheep, rock, wood, wheat + 3 random 3:1
            portTypes = [
                'brick_2-1',
                'sheep_2-1',
                'rock_2-1',
                'wood_2-1',
                'wheat_2-1',
                'generic_3-1',
                'generic_3-1',
                'generic_3-1',
            ];
        } else if (playerCount === 6) {
            // 6-player: 1 wood, 1 wheat, 1 rock, 1 brick, 2 sheep + 5 random 3:1
            portTypes = [
                'wood_2-1',
                'wheat_2-1',
                'rock_2-1',
                'brick_2-1',
                'sheep_2-1',
                'sheep_2-1',
                'generic_3-1',
                'generic_3-1',
                'generic_3-1',
                'generic_3-1',
                'generic_3-1',
            ];
        } else {
            // 4-player: one brick, sheep, rock, wood, wheat + 4 random 3:1
            portTypes = [
                'brick_2-1',
                'sheep_2-1',
                'rock_2-1',
                'wood_2-1',
                'wheat_2-1',
                'generic_3-1',
                'generic_3-1',
                'generic_3-1',
                'generic_3-1',
            ];
        }

        // Fisher-Yates shuffle
        for (let i = portTypes.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom(seed++) * (i + 1));
            [portTypes[i], portTypes[j]] = [portTypes[j], portTypes[i]];
        }

        return portTypes;
    }, [playerCount, expansion, randomSeed]);

    // Generate randomized port assignments
    const generatePortAssignments = useMemo(() => {
        const seededRandom = (seed: number) => {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };

        let seed = randomSeed;
        let portTypes: string[] = [];

        if (playerCount === 4) {
            // Classic 4-player: brick_2-1, sheep_2-1, rock_2-1, wheat_2-1, wood_2-1, generic_3-1, generic_3-1, generic_3-1, generic_3-1 (9 total)
            portTypes = [
                'brick_2-1',
                'sheep_2-1',
                'rock_2-1',
                'wheat_2-1',
                'wood_2-1',
                'generic_3-1',
                'generic_3-1',
                'generic_3-1',
                'generic_3-1',
            ];
        } else {
            // Classic 5-6 player: brick_2-1, sheep_2-1, rock_2-1, wheat_2-1, wood_2-1, wood_2-1, generic_3-1 x5 (11 total)
            portTypes = [
                'brick_2-1',
                'sheep_2-1',
                'rock_2-1',
                'wheat_2-1',
                'wood_2-1',
                'wood_2-1',
                'generic_3-1',
                'generic_3-1',
                'generic_3-1',
                'generic_3-1',
                'generic_3-1',
            ];
        }

        // Fisher-Yates shuffle
        for (let i = portTypes.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom(seed++) * (i + 1));
            [portTypes[i], portTypes[j]] = [portTypes[j], portTypes[i]];
        }

        return portTypes;
    }, [playerCount, expansion, randomSeed]);

    return (
        <main
            className="h-screen w-screen flex flex-col items-center justify-center overflow-hidden"
            style={{
                backgroundImage: 'url(/images/catan_water.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >
            <div
                style={{
                    position: 'relative',
                    width: `${boardWidth}px`,
                    height: `${boardHeight}px`,
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
                        width: `${boardWidth}px`,
                        height: `${boardHeight}px`,
                        transform: playerCount === 3 ? 'rotate(90deg)' : undefined,
                        transformOrigin: 'center',
                        margin: '0 auto',
                        marginTop: expansion === 'seafarers' && (playerCount === 3 || playerCount === 4 || playerCount === 6) ? `${inchesToPixels(playerCount === 3 ? 0.625 : 3.5)}px` : undefined,
                    }}
                >
                    <svg
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: `${boardWidth}px`,
                            height: `${boardHeight}px`,
                            pointerEvents: 'none',
                        }}
                        viewBox={`0 0 ${boardWidth} ${boardHeight}`}
                    >
                        <defs>
                            {hexes.map((hex) => (
                                <mask key={`mask-${hex.id}`} id={`hex-mask-${hex.id}`}>
                                    <rect
                                        width={boardWidth}
                                        height={boardHeight}
                                        fill="white"
                                    />
                                    <polygon
                                        points={getHexagonPoints(hexWidth / 2 + hex.x, hexHeight / 2 + hex.y)}
                                        fill="black"
                                    />
                                </mask>
                            ))}
                        </defs>
                    </svg>


                    {/* Classic perimeter border line - separate SVG for z-index control */}
                    {expansion === 'classic' && playerCount === '5-6' && perimeterPoints.length > 0 && (
                        <svg
                            style={{
                                position: 'absolute',
                                inset: '-500px',
                                width: `calc(${boardWidth}px + 1000px)`,
                                height: `calc(${boardHeight}px + 1000px)`,
                                pointerEvents: 'none',
                                zIndex: 10,
                            }}
                            viewBox={`-500 -500 ${boardWidth + 1000} ${boardHeight + 1000}`}
                        >
                            <defs>
                                <filter id="borderFade" x="-50%" y="-50%" width="200%" height="200%" filterUnits="objectBoundingBox">
                                    <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
                                </filter>
                            </defs>

                            {/* Outer thicker border */}
                            <g>
                                {perimeterPoints.map((point, idx) => {
                                    const nextIdx = (idx + 1) % perimeterPoints.length;
                                    const nextPoint = perimeterPoints[nextIdx];

                                    return (
                                        <line
                                            key={`border-outer-${idx}`}
                                            x1={point.x}
                                            y1={point.y}
                                            x2={nextPoint.x}
                                            y2={nextPoint.y}
                                            stroke="#E6D7AA"
                                            strokeWidth="8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            opacity="0.2"
                                        />
                                    );
                                })}
                            </g>

                            {/* Inner faded border */}
                            <g filter="url(#borderFade)">
                                {/* Connect consecutive dots to form border */}
                                {perimeterPoints.map((point, idx) => {
                                    const nextIdx = (idx + 1) % perimeterPoints.length;
                                    const nextPoint = perimeterPoints[nextIdx];

                                    return (
                                        <line
                                            key={`border-${idx}`}
                                            x1={point.x}
                                            y1={point.y}
                                            x2={nextPoint.x}
                                            y2={nextPoint.y}
                                            stroke="#E6D7AA"
                                            strokeWidth="25"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    );
                                })}
                            </g>


                        </svg>
                    )}

                    {/* For classic 4-player */}
                    {expansion === 'classic' && playerCount === 4 && perimeterPoints.length > 0 && (
                        <svg
                            style={{
                                position: 'absolute',
                                inset: '-500px',
                                width: `calc(${boardWidth}px + 1000px)`,
                                height: `calc(${boardHeight}px + 1000px)`,
                                pointerEvents: 'none',
                                zIndex: 10,
                            }}
                            viewBox={`-500 -500 ${boardWidth + 1000} ${boardHeight + 1000}`}
                        >
                            <defs>
                                <filter id="borderFade4" x="-50%" y="-50%" width="200%" height="200%" filterUnits="objectBoundingBox">
                                    <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
                                </filter>
                            </defs>

                            {/* Outer thicker border */}
                            <g>
                                {perimeterPoints.map((point, idx) => {
                                    const nextIdx = (idx + 1) % perimeterPoints.length;
                                    const nextPoint = perimeterPoints[nextIdx];

                                    return (
                                        <line
                                            key={`border-outer-4-${idx}`}
                                            x1={point.x}
                                            y1={point.y}
                                            x2={nextPoint.x}
                                            y2={nextPoint.y}
                                            stroke="#E6D7AA"
                                            strokeWidth="8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            opacity="0.2"
                                        />
                                    );
                                })}
                            </g>

                            {/* Inner faded border */}
                            <g filter="url(#borderFade4)">
                                {perimeterPoints.map((point, idx) => {
                                    const nextIdx = (idx + 1) % perimeterPoints.length;
                                    const nextPoint = perimeterPoints[nextIdx];

                                    return (
                                        <line
                                            key={`border-4-${idx}`}
                                            x1={point.x}
                                            y1={point.y}
                                            x2={nextPoint.x}
                                            y2={nextPoint.y}
                                            stroke="#E6D7AA"
                                            strokeWidth="25"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    );
                                })}
                            </g>


                        </svg>
                    )}

                    {/* Big island border for seafarers */}
                    {expansion === 'seafarers' && scenario !== '4-islands' && buildBigIslandPerimeter.length > 0 && (
                        <svg
                            style={{
                                position: 'absolute',
                                inset: '-500px',
                                width: `calc(${boardWidth}px + 1000px)`,
                                height: `calc(${boardHeight}px + 1000px)`,
                                pointerEvents: 'none',
                                zIndex: 10,
                            }}
                            viewBox={`-500 -500 ${boardWidth + 1000} ${boardHeight + 1000}`}
                        >
                            <defs>
                                <filter id="bigIslandBorderFade" x="-50%" y="-50%" width="200%" height="200%" filterUnits="objectBoundingBox">
                                    <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
                                </filter>
                            </defs>

                            {/* Outer thicker border */}
                            <g>
                                {buildBigIslandPerimeter.map((point, idx) => {
                                    const nextIdx = (idx + 1) % buildBigIslandPerimeter.length;
                                    const nextPoint = buildBigIslandPerimeter[nextIdx];

                                    return (
                                        <line
                                            key={`big-island-border-outer-${idx}`}
                                            x1={point.x}
                                            y1={point.y}
                                            x2={nextPoint.x}
                                            y2={nextPoint.y}
                                            stroke="#E6D7AA"
                                            strokeWidth="6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            opacity="0.25"
                                        />
                                    );
                                })}
                            </g>

                            {/* Inner faded border */}
                            <g filter="url(#bigIslandBorderFade)">
                                {buildBigIslandPerimeter.map((point, idx) => {
                                    const nextIdx = (idx + 1) % buildBigIslandPerimeter.length;
                                    const nextPoint = buildBigIslandPerimeter[nextIdx];

                                    return (
                                        <line
                                            key={`big-island-border-${idx}`}
                                            x1={point.x}
                                            y1={point.y}
                                            x2={nextPoint.x}
                                            y2={nextPoint.y}
                                            stroke="#E6D7AA"
                                            strokeWidth="20"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    );
                                })}
                            </g>

                        </svg>
                    )
                    }

                    {/* Big island ports for seafarers */}
                    {expansion === 'seafarers' && scenario !== '4-islands' && buildBigIslandPerimeter.length > 0 && (
                        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
                            {(playerCount === 3 ? [
                                [25, 0], [1, 2], [4, 5], [7, 8], [12, 13], [17, 18], [20, 21]
                            ] : playerCount === 6 ? [
                                [3, 4], [7, 8], [10, 11], [13, 14], [16, 17], [19, 20], [22, 23], [26, 27], [30, 31], [33, 34], [36, 37]
                            ] : [
                                [2, 3], [5, 6], [8, 9], [12, 13], [15, 16], [18, 19], [22, 23], [25, 26], [28, 29]
                            ]).map((pair, idx) => {
                                const p1 = buildBigIslandPerimeter[pair[0]];
                                const p2 = buildBigIslandPerimeter[pair[1]];

                                if (!p1 || !p2) return null;

                                const midX = (p1.x + p2.x) / 2;
                                const midY = (p1.y + p2.y) / 2;
                                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI) + 180;

                                const portType = generateBigIslandPortAssignments[idx];
                                const boatImage = `/images/catan_boat_${portType}.png`;
                                const portSize = hexWidth * 1.4;
                                const portOffset = portSize / 2;

                                return (
                                    <div
                                        key={`big-island-port-${idx}`}
                                        style={{
                                            position: 'absolute',
                                            left: `${midX - portOffset}px`,
                                            top: `${midY - portOffset}px`,
                                            width: `${portSize}px`,
                                            height: `${portSize}px`,
                                            transform: `rotate(${angle}deg)`,
                                            transformOrigin: 'center',
                                        }}
                                    >
                                        <img
                                            src={boatImage}
                                            alt={`Big Island Port ${portType}`}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                                pointerEvents: 'none',
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Port ships for classic - separated for proper z-index control */}
                    {expansion === 'classic' && playerCount === '5-6' && perimeterPoints.length > 0 && (
                        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
                            {[[2, 3], [7, 8], [10, 11], [14, 15], [19, 20], [22, 23], [25, 26], [28, 29], [31, 32], [34, 35], [38, 0]].map((pair, idx) => {
                                const p1 = perimeterPoints[pair[0]];
                                const p2 = perimeterPoints[pair[1]];

                                if (!p1 || !p2) return null;

                                const midX = (p1.x + p2.x) / 2;
                                const midY = (p1.y + p2.y) / 2;
                                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI) + 180;

                                const portType = generatePortAssignments[idx];
                                const boatImage = `/images/catan_boat_${portType}.png`; // Direct path for testing
                                const portSize = hexWidth * 1.4;
                                const portOffset = portSize / 2;

                                return (
                                    <div
                                        key={`port-${idx}`}
                                        style={{
                                            position: 'absolute',
                                            left: `${midX - portOffset}px`,
                                            top: `${midY - portOffset}px`,
                                            width: `${portSize}px`,
                                            height: `${portSize}px`,
                                            transform: `rotate(${angle}deg)`,
                                            transformOrigin: 'center',
                                        }}
                                    >
                                        <img
                                            src={boatImage}
                                            alt={`Port ${portType}`}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                                pointerEvents: 'none',
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* For classic 4-player */}
                    {expansion === 'classic' && playerCount === 4 && perimeterPoints.length > 0 && (
                        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
                            {[[0, 1], [3, 4], [7, 8], [10, 11], [13, 14], [17, 18], [20, 21], [23, 24], [27, 28]].map((pair, idx) => {
                                const p1 = perimeterPoints[pair[0]];
                                const p2 = perimeterPoints[pair[1]];

                                if (!p1 || !p2) return null;

                                const midX = (p1.x + p2.x) / 2;
                                const midY = (p1.y + p2.y) / 2;
                                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI) + 180;

                                const portType = generatePortAssignments[idx];
                                const boatImage = `/images/catan_boat_${portType}.png`; // Direct path for testing
                                const portSize = hexWidth * 1.4;
                                const portOffset = portSize / 2;

                                return (
                                    <div
                                        key={`port-${idx}`}
                                        style={{
                                            position: 'absolute',
                                            left: `${midX - portOffset}px`,
                                            top: `${midY - portOffset}px`,
                                            width: `${portSize}px`,
                                            height: `${portSize}px`,
                                            transform: `rotate(${angle}deg)`,
                                            transformOrigin: 'center',
                                        }}
                                    >
                                        <img
                                            src={boatImage}
                                            alt={`Port ${portType}`}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                                pointerEvents: 'none',
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Water hex borders - separate layer below hex content */}
                    <svg
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: `${boardWidth}px`,
                            height: `${boardHeight}px`,
                            pointerEvents: 'none',
                            zIndex: 1,
                        }}
                        viewBox={`0 0 ${boardWidth} ${boardHeight}`}
                    >
                        {hexes.filter(hex => hex.resourceType === 'water').map((hex) => (
                            <polygon
                                key={`water-border-${hex.id}`}
                                points={getHexagonPoints(hexWidth / 2 + hex.x, hexHeight / 2 + hex.y)}
                                fill="none"
                                stroke="#bfdbfe"
                                strokeWidth="1.5"
                            />
                        ))}
                    </svg>

                    {hexes.map((hex, index) => (
                        <div
                            key={hex.id}
                            style={{
                                position: 'absolute',
                                left: `${hex.x}px`,
                                top: `${hex.y}px`,
                                width: `${hexWidth}px`,
                                height: `${hexHeight}px`,
                                overflow: 'visible',
                                zIndex: 2,
                            }}
                        >
                            {/* Resource image background */}
                            {expansion === 'seafarers' ? (
                                // For Seafarers: wrapper with clip-path, inner div with rotated image
                                // The image is rotated -90deg, so we swap width/height and adjust positioning
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        clipPath: `polygon(${getHexagonClipPath()})`,
                                        overflow: 'hidden',
                                    }}
                                >
                                    <div
                                        style={{
                                            position: 'absolute',
                                            width: `${Math.max(hexWidth, hexHeight) * 1.414}px`, // Diagonal to cover rotated hex
                                            height: `${Math.max(hexWidth, hexHeight) * 1.414}px`,
                                            left: `${(hexWidth - Math.max(hexWidth, hexHeight) * 1.414) / 2}px`,
                                            top: `${(hexHeight - Math.max(hexWidth, hexHeight) * 1.414) / 2}px`,
                                            backgroundImage: resourceImages[hex.resourceType] ? `url(${resourceImages[hex.resourceType]})` : 'none',
                                            backgroundSize: `${Math.max(hexWidth, hexHeight) * 1.414}px ${Math.max(hexWidth, hexHeight) * 1.414}px`,
                                            backgroundPosition: 'center',
                                            transform: 'rotate(-90deg)',
                                            transformOrigin: 'center',
                                        }}
                                    />
                                </div>
                            ) : (
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        backgroundImage: resourceImages[hex.resourceType] ? `url(${resourceImages[hex.resourceType]})` : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        clipPath: `polygon(${getHexagonClipPath()})`,
                                    }}
                                />
                            )}

                            {/* Light brown fading border overlay */}
                            <svg
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    width: '100%',
                                    height: '100%',
                                    pointerEvents: 'none',
                                }}
                                viewBox={`0 0 ${hexWidth} ${hexHeight}`}
                                preserveAspectRatio="none"
                            >
                                <defs>
                                    <radialGradient
                                        id={`border-gradient-${hex.id}`}
                                        cx="50%"
                                        cy="50%"
                                        r="50%"
                                        fx="50%"
                                        fy="50%"
                                    >
                                        <stop offset="60%" stopColor="rgba(230, 215, 170, 0)" />
                                        <stop offset="85%" stopColor="rgba(230, 215, 170, 0.5)" />
                                        <stop offset="100%" stopColor="rgba(230, 215, 170, 1)" />
                                    </radialGradient>
                                </defs>
                                {hex.resourceType !== 'water' && (
                                    <>
                                        <polygon
                                            points={getHexagonPoints(hexWidth / 2, hexHeight / 2)}
                                            fill={`url(#border-gradient-${hex.id})`}
                                        />
                                        <polygon
                                            points={getHexagonPoints(hexWidth / 2, hexHeight / 2)}
                                            fill="none"
                                            stroke="#E6D7AA"
                                            strokeWidth="4"
                                        />
                                        {/* Outer border - extends beyond hex shape */}
                                        <polygon
                                            points={getOuterHexagonPoints(hexWidth / 2, hexHeight / 2, 3)}
                                            fill="none"
                                            stroke="#E6D7AA"
                                            strokeWidth="2"
                                            opacity="0.7"
                                        />
                                    </>
                                )}
                            </svg>

                            {/* Number token */}
                            {hex.number !== undefined && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: expansion === 'seafarers'
                                            ? 'translate(-50%, -50%) rotate(-90deg)'
                                            : 'translate(-50%, -50%)',
                                        width: `${hexWidth * 0.35}px`,
                                        height: `${hexWidth * 0.35}px`,
                                        backgroundColor: '#f5f5dc',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: 'none',
                                        zIndex: 10,
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: `${hexWidth * 0.18}px`,
                                            fontWeight: 'bold',
                                            color: hex.number === 6 || hex.number === 8 ? '#d32f2f' : '#000',
                                            fontFamily: 'Arial, sans-serif',
                                            lineHeight: 1,
                                        }}
                                    >
                                        {hex.number}
                                    </span>
                                    {/* Probability dots */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: '2px',
                                            marginTop: '2px',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        {Array.from({ length: getDotCount(hex.number) }).map((_, i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    width: '3px',
                                                    height: '3px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#000',
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Hex index label for 4-islands scenario (temporary for debugging) */}
                            {scenario === '4-islands' && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '10%',
                                        left: '50%',
                                        transform: expansion === 'seafarers'
                                            ? 'translate(-50%, -50%) rotate(-90deg)'
                                            : 'translate(-50%, -50%)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        color: '#000',
                                        border: '1px solid #333',
                                        zIndex: 100,
                                    }}
                                >
                                    {index + 1}
                                </div>
                            )}

                        </div>
                    ))}
                </div>
            </div>

            <GameSettingsPanel
                expansion={expansion}
                onExpansionChange={setExpansion}
            >
                <button
                    onClick={() => setRandomSeed(Math.random() * 10000)}
                    className="w-full px-6 py-3 rounded-lg font-semibold text-lg transition-colors bg-gray-700 text-white hover:bg-gray-600 text-left"
                >
                    Randomize
                </button>

                {expansion === 'classic' ? (
                    <>
                        <button
                            onClick={() => setPlayerCount(4)}
                            className={`w-full px-6 py-3 rounded-lg font-semibold text-lg transition-colors text-left ${playerCount === 4
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                                }`}
                        >
                            4 Players
                        </button>

                        <button
                            onClick={() => setPlayerCount('5-6')}
                            className={`w-full px-6 py-3 rounded-lg font-semibold text-lg transition-colors text-left ${playerCount === '5-6'
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                                }`}
                        >
                            5-6 Players
                        </button>
                    </>
                ) : (
                    <>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-700">Scenario</label>
                            <select
                                value={scenario}
                                onChange={(e) => setScenario(e.target.value as ScenarioType)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="heading-for-new-shores">Heading for New Shores</option>
                                <option value="4-islands">4 Islands</option>
                            </select>
                        </div>

                        {scenario !== '4-islands' && (
                            <button
                                onClick={() => setPlayerCount(3)}
                                className={`w-full px-6 py-3 rounded-lg font-semibold text-lg transition-colors text-left ${playerCount === 3
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                                    }`}
                            >
                                3 Players
                            </button>
                        )}

                        <button
                            onClick={() => setPlayerCount(4)}
                            className={`w-full px-6 py-3 rounded-lg font-semibold text-lg transition-colors text-left ${playerCount === 4
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                                }`}
                        >
                            4 Players
                        </button>

                        {scenario !== '4-islands' && (
                            <button
                                onClick={() => setPlayerCount(6)}
                                className={`w-full px-6 py-3 rounded-lg font-semibold text-lg transition-colors text-left ${playerCount === 6
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                                    }`}
                            >
                                6 Players
                            </button>
                        )}
                    </>
                )}
            </GameSettingsPanel>
        </main>
    );
}
