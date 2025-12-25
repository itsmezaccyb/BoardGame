'use client';

import { inchesToPixels } from '@/lib/dimensions';
import { useState, useMemo, useEffect } from 'react';
import { GameSettingsPanel } from '@/components/GameSettingsPanel';
import { getImageUrl } from '@/lib/image-mapping';

type ResourceType = 'forest' | 'pasture' | 'field' | 'mountain' | 'hill' | 'desert';

interface Hex {
    id: string;
    x: number;
    y: number;
    resourceType: ResourceType;
    number?: number;
}

export default function CatanPage() {
    const [playerCount, setPlayerCount] = useState<4 | '5-6'>(4);
    const [randomSeed, setRandomSeed] = useState(0);

    // Auto-randomize on mount and player count change
    useEffect(() => {
        setRandomSeed(Math.random() * 10000);
    }, [playerCount]);

    // Resource image mapping
    const resourceImages: Record<ResourceType, string> = {
        forest: getImageUrl('/images/catan_woods.png'),
        pasture: getImageUrl('/images/catan_sheep.png'),
        field: getImageUrl('/images/catan_wheat.png'),
        mountain: getImageUrl('/images/catan_rock.png'),
        hill: getImageUrl('/images/catan_brick.png'),
        desert: getImageUrl('/images/catan_desert.png'),
    };

    // Resource counts for each player mode
    const resourceCounts = {
        4: {
            forest: 4,
            pasture: 4,
            field: 4,
            mountain: 3,
            hill: 3,
            desert: 1,
        },
        '5-6': {
            forest: 6,
            pasture: 6,
            field: 6,
            mountain: 5,
            hill: 5,
            desert: 2,
        },
    };

    // Hexagon dimensions based on Catan specifications
    const hexWidth = inchesToPixels(3.12);
    const hexHeight = inchesToPixels(3.6);
    const verticalSpacing = hexHeight * 0.75; // 25% overlap for interlocking

    // Row configurations for different player counts
    const rowConfigurations = {
        4: [
            { count: 3, offset: 1 },
            { count: 4, offset: 0.5 },
            { count: 5, offset: 0 },
            { count: 4, offset: 0.5 },
            { count: 3, offset: 1 },
        ],
        '5-6': [
            { count: 4, offset: 1 },
            { count: 5, offset: 0.5 },
            { count: 6, offset: 0 },
            { count: 6, offset: -0.5 },
            { count: 5, offset: 0 },
            { count: 4, offset: 0.5 },
        ],
    };

    const rows = rowConfigurations[playerCount];

    // Seeded random number generator for reproducibility
    const seededRandom = (seed: number, index: number) => {
        const x = Math.sin(seed + index) * 10000;
        return x - Math.floor(x);
    };

    // Number distribution: 2-12 (skipping 7)
    const getNumberDistribution = () => {
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

    // Generate all hex positions with randomized resources and numbers
    const hexes = useMemo(() => {
        const hexesArray: Hex[] = [];
        const verticalOffset = playerCount === '5-6' ? -0.5 * verticalSpacing : 0;
        const counts = resourceCounts[playerCount];

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

        // Shuffle numbers using seeded random
        for (let i = numbersArray.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom(randomSeed + 1000, i) * (i + 1));
            [numbersArray[i], numbersArray[j]] = [numbersArray[j], numbersArray[i]];
        }

        // Assign resources and numbers to hex positions
        let resourceIndex = 0;
        let numberIndex = 0;
        rows.forEach((row, rowIndex) => {
            const startX = row.offset * hexWidth;
            for (let colIndex = 0; colIndex < row.count; colIndex++) {
                const resource = resourcesArray[resourceIndex] || 'desert';
                hexesArray.push({
                    id: `hex-${rowIndex}-${colIndex}`,
                    x: startX + colIndex * hexWidth,
                    y: rowIndex * verticalSpacing + verticalOffset,
                    resourceType: resource,
                    number: resource === 'desert' ? undefined : numbersArray[numberIndex++],
                });
                resourceIndex++;
            }
        });

        return hexesArray;
    }, [randomSeed, playerCount]);

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
    const boardWidth = 5 * hexWidth;
    const boardHeight = 4 * verticalSpacing + hexHeight;

    // Helper to get vertices for hex at row/col
    const getHexVerticesAt = (rowIdx: number, colIdx: number) => {
        let hexIndex = 0;
        for (let r = 0; r < rowIdx; r++) {
            hexIndex += rows[r].count;
        }
        hexIndex += colIdx;
        const hex = hexes[hexIndex];

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

    // Generate randomized port assignments
    const generatePortAssignments = useMemo(() => {
        const seededRandom = (seed: number) => {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };

        let seed = randomSeed;
        let portTypes: string[] = [];

        if (playerCount === 4) {
            // 4-player: brick_2-1, sheep_2-1, rock_2-1, wheat_2-1, wood_2-1, generic_3-1, generic_3-1, generic_3-1, generic_3-1 (9 total)
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
            // 5-6 player: brick_2-1, sheep_2-1, rock_2-1, wheat_2-1, wood_2-1, wood_2-1, generic_3-1 x5 (11 total)
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
    }, [playerCount, randomSeed]);

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

                {/* Perimeter border line - separate SVG for z-index control */}
                {playerCount === '5-6' && perimeterPoints.length > 0 && (
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

                {/* For 4-player */}
                {playerCount === 4 && perimeterPoints.length > 0 && (
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

                {/* Port ships - separated for proper z-index control */}
                {playerCount === '5-6' && perimeterPoints.length > 0 && (
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

                {/* For 4-player */}
                {playerCount === 4 && perimeterPoints.length > 0 && (
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

                {hexes.map((hex) => (
                    <div
                        key={hex.id}
                        style={{
                            position: 'absolute',
                            left: `${hex.x}px`,
                            top: `${hex.y}px`,
                            width: `${hexWidth}px`,
                            height: `${hexHeight}px`,
                            overflow: 'visible',
                        }}
                    >
                        {/* Resource image background */}
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundImage: `url(${resourceImages[hex.resourceType]})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                clipPath: `polygon(${getHexagonClipPath()})`,
                            }}
                        />

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
                        </svg>

                        {/* Number token */}
                        {hex.number !== undefined && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
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
                    </div>
                ))}
            </div>

            <GameSettingsPanel>
                <button
                    onClick={() => setRandomSeed(Math.random() * 10000)}
                    className="w-full px-6 py-3 rounded-lg font-semibold text-lg transition-colors bg-gray-700 text-white hover:bg-gray-600 text-left"
                >
                    Randomize
                </button>

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
            </GameSettingsPanel>
        </main>
    );
}
