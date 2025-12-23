'use client';

import { inchesToPixels } from '@/lib/dimensions';
import { GameSettingsPanel } from '@/components/GameSettingsPanel';
import { getImageUrl } from '@/lib/image-mapping';

export default function ChessPage() {
    const squareSize = inchesToPixels(1); // Each square is 1 inch × 1 inch
    const boardSize = inchesToPixels(8); // Total board is 8 inches × 8 inches

    const renderSquare = (row: number, col: number) => {
        const isLight = (row + col) % 2 === 0;
        const bgColor = isLight ? '#ffffff' : '#000000'; // Alternating black and white squares

        return (
            <div
                key={`${row}-${col}`}
                style={{
                    width: `${squareSize}px`,
                    height: `${squareSize}px`,
                    backgroundColor: bgColor,
                }}
            />
        );
    };

    return (
        <main
            className="h-screen w-screen flex items-center justify-center overflow-hidden"
            style={{
                backgroundImage: `url(${getImageUrl('/images/Wood.jpg')})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(8, ${squareSize}px)`,
                    gridTemplateRows: `repeat(8, ${squareSize}px)`,
                    width: `${boardSize}px`,
                    height: `${boardSize}px`,
                }}
            >
                {Array.from({ length: 8 }).map((_, row) =>
                    Array.from({ length: 8 }).map((_, col) => renderSquare(row, col))
                )}
            </div>
            <GameSettingsPanel />
        </main>
    );
}

