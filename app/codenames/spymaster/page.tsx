'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { inchesToPixels } from '@/lib/dimensions';
import { GameSettingsPanel } from '@/components/GameSettingsPanel';
import { loadWordList, selectWords } from '@/lib/codenames/words';
import { loadImageList, selectImages } from '@/lib/codenames/images';
import {
  createGameState,
  loadGameStateFromServer,
  saveGameStateToServer,
  revealCard,
  type GameState,
  type CardType,
} from '@/lib/codenames/game';

const CARD_COLORS: Record<CardType, string> = {
  red: '#d32f2f',
  blue: '#1976d2',
  neutral: '#9e9e9e',
  assassin: '#000000',
};

function SpymasterViewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  const code = searchParams.get('code') || '';
  const mode = (searchParams.get('mode') as 'word' | 'image') || 'word';
  const variant = searchParams.get('variant') || '';

  useEffect(() => {
    if (!code || !variant) {
      router.push('/codenames');
      return;
    }

    const initializeGame = async () => {
      setLoading(true);
      try {
        // Try to load existing state from server
        const storedState = await loadGameStateFromServer(code);
        
        if (storedState && storedState.mode === mode && storedState.variant === variant) {
          // Use stored state if it matches
          setGameState(storedState);
          setLoading(false);
          return;
        }

        // Otherwise, create new game
        let contents: string[] = [];

        if (mode === 'word') {
          const words = await loadWordList(variant);
          const seed = codeToSeed(code);
          contents = selectWords(words, seed);
        } else {
          const imagePaths = await loadImageList(variant);
          const seed = codeToSeed(code);
          // Image list already returns existing images from API
          contents = selectImages(imagePaths, seed);
        }

        const state = createGameState(code, mode, variant, contents);
        setGameState(state);
        await saveGameStateToServer(state);
      } catch (error) {
        console.error('Error initializing game:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeGame();
  }, [code, mode, variant, router]);

  // Sync state from server to show revealed cards
  useEffect(() => {
    if (gameState) {
      const interval = setInterval(async () => {
        const serverState = await loadGameStateFromServer(code);
        if (serverState && JSON.stringify(serverState.cards) !== JSON.stringify(gameState.cards)) {
          setGameState(serverState);
        }
      }, 1000); // Check every 1 second

      return () => clearInterval(interval);
    }
  }, [gameState, code]);

  const handleNewGame = () => {
    router.push('/codenames');
  };

  const handleRevealCard = async (cardId: number) => {
    if (!gameState) return;
    const newState = revealCard(gameState, cardId);
    setGameState(newState);
    await saveGameStateToServer(newState);
  };

  if (loading) {
    return (
      <main className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: '#fafafa' }}>
        <p className="text-2xl text-gray-600">Loading game...</p>
      </main>
    );
  }

  if (!gameState) {
    return (
      <main className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: '#fafafa' }}>
        <div className="text-center">
          <p className="text-2xl text-gray-600 mb-4">Error loading game</p>
          <button
            onClick={handleNewGame}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </main>
    );
  }

  const cardSize = inchesToPixels(2.5); // Each card is 2.5 inches
  const gap = inchesToPixels(0.2); // Gap between cards
  const gridSize = 5 * cardSize + 4 * gap;

  return (
    <main className="h-screen w-screen flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: '#fafafa' }}>
      <GameSettingsPanel>
        {/* Game Info */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">
            Game Code: <span className="font-bold text-gray-900">{gameState.code}</span>
          </p>
          <p className="text-sm text-gray-600">
            Starting Team: <span className="font-semibold" style={{ color: CARD_COLORS[gameState.startingTeam] }}>
              {gameState.startingTeam.toUpperCase()}
            </span>
          </p>
        </div>
        <button
          onClick={handleNewGame}
          className="w-full px-6 py-3 rounded-lg font-semibold text-lg transition-colors bg-gray-700 text-white hover:bg-gray-600 text-left"
        >
          New Game
        </button>
      </GameSettingsPanel>

      {/* Key Card Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(5, ${cardSize}px)`,
          gridTemplateRows: `repeat(5, ${cardSize}px)`,
          gap: `${gap}px`,
          width: `${gridSize}px`,
          height: `${gridSize}px`,
        }}
      >
        {gameState.cards.map((card) => (
          <KeyCard
            key={card.id}
            card={card}
            mode={mode}
            size={cardSize}
            onReveal={() => handleRevealCard(card.id)}
          />
        ))}
      </div>

      {/* Revealed Status */}
      <div className="absolute bottom-8 left-8 right-8">
        <p className="text-center text-gray-600">
          Revealed: {gameState.cards.filter(c => c.revealed).length} / 25
        </p>
      </div>
    </main>
  );
}

interface KeyCardProps {
  card: { id: number; content: string; type: CardType; revealed: boolean };
  mode: 'word' | 'image';
  size: number;
  onReveal: () => void;
}

function KeyCard({ card, mode, size, onReveal }: KeyCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const color = CARD_COLORS[card.type];
  const isRevealed = card.revealed;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        border: '3px solid #333',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        opacity: isRevealed ? 0.7 : 1,
        cursor: isHovered && !isRevealed ? 'pointer' : 'default',
      }}
    >
      {/* Content */}
      {mode === 'word' ? (
        <span
          style={{
            fontSize: `${size * 0.12}px`,
            fontWeight: 'bold',
            color: '#fff',
            textAlign: 'center',
            padding: '4px',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            zIndex: 2,
          }}
        >
          {card.content}
        </span>
      ) : (
        <>
          <img
            src={card.content}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.3,
              zIndex: 1,
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </>
      )}

      {/* Type Label */}
      <div
        style={{
          position: 'absolute',
          bottom: '4px',
          left: '4px',
          right: '4px',
          backgroundColor: 'rgba(0,0,0,0.6)',
          color: '#fff',
          fontSize: `${size * 0.1}px`,
          fontWeight: 'bold',
          textAlign: 'center',
          padding: '2px',
          borderRadius: '4px',
          zIndex: 3,
        }}
      >
        {card.type.toUpperCase()}
      </div>

      {/* Revealed Indicator */}
      {isRevealed && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '16px',
            height: '16px',
            backgroundColor: '#fff',
            borderRadius: '50%',
            border: '2px solid #000',
            zIndex: 4,
          }}
        />
      )}

      {/* Reveal Button - Shows on hover if not revealed */}
      {isHovered && !isRevealed && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReveal();
          }}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            border: 'none',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 5,
            transition: 'opacity 0.2s ease-in-out',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <span
            style={{
              color: '#fff',
              fontSize: `${size * 0.15}px`,
              fontWeight: 'bold',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              padding: '8px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              border: '2px solid #fff',
            }}
          >
            Reveal
          </span>
        </button>
      )}
    </div>
  );
}

export default function SpymasterView() {
  return (
    <Suspense fallback={
      <main className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: '#fafafa' }}>
        <p className="text-2xl text-gray-600">Loading game...</p>
      </main>
    }>
      <SpymasterViewContent />
    </Suspense>
  );
}

// Helper functions
function codeToSeed(code: string): number {
  let seed = 0;
  for (let i = 0; i < code.length; i++) {
    seed = seed * 36 + parseInt(code[i], 36);
  }
  return seed;
}

