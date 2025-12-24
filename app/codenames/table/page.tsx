'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { inchesToPixels } from '@/lib/dimensions';
import { InteractiveGameSettingsPanel } from '@/components/InteractiveGameSettingsPanel';
import { loadWordList, selectWords } from '@/lib/codenames/words';
import { loadImageList, selectImages } from '@/lib/codenames/images';
import {
  createGameState,
  revealCard,
  resetRevealed,
  saveGameStateToServer,
  loadGameStateFromServer,
  type GameState,
  type CardType,
} from '@/lib/codenames/game';

const CARD_COLORS: Record<CardType, string> = {
  red: '#d32f2f',
  blue: '#1976d2',
  neutral: '#9e9e9e',
  assassin: '#000000',
};

function TableViewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [gifsFrozen, setGifsFrozen] = useState(true);
  const [jumboView, setJumboView] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

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

  // Track window size for jumbo view calculations
  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Set initial size
    updateWindowSize();

    // Add event listener
    window.addEventListener('resize', updateWindowSize);

    // Cleanup
    return () => window.removeEventListener('resize', updateWindowSize);
  }, []);

  // Sync state to server whenever it changes
  useEffect(() => {
    if (gameState) {
      saveGameStateToServer(gameState);

      // Also set up polling to check for updates from other players
      const interval = setInterval(async () => {
        const serverState = await loadGameStateFromServer(code);
        if (serverState && JSON.stringify(serverState.cards) !== JSON.stringify(gameState.cards)) {
          setGameState(serverState);
        }
      }, 1000); // Check every 1 second

      return () => clearInterval(interval);
    }
  }, [gameState, code]);

  const handleCardClick = async (cardId: number) => {
    if (!gameState) return;
    const newState = revealCard(gameState, cardId);
    setGameState(newState);
    await saveGameStateToServer(newState);
  };

  const handleReset = async () => {
    if (!gameState) return;
    const newState = resetRevealed(gameState);
    setGameState(newState);
    await saveGameStateToServer(newState);
  };

  const handleNewGame = () => {
    router.push('/codenames');
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

  // Calculate card dimensions
  const gap = inchesToPixels(0.2); // Gap between cards
  const cardSize = jumboView && windowSize.height > 0
    ? Math.min(
      (windowSize.height - 120) / 5 - gap, // Use most of screen height minus padding
      windowSize.width / 5 - gap // Don't exceed screen width
    )
    : inchesToPixels(2.5); // Each card is 2.5 inches in normal view
  const gridSize = 5 * cardSize + 4 * gap;

  return (
    <main className="h-screen w-screen flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: '#fafafa' }}>
      <InteractiveGameSettingsPanel>
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
        {/* Jumbo View Toggle */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-lg">
          <span className="font-semibold text-gray-900">Jumbo View</span>
          <button
            onClick={() => setJumboView(!jumboView)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${jumboView ? 'bg-green-600' : 'bg-gray-300'
              }`}
            role="switch"
            aria-checked={jumboView}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${jumboView ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
          </button>
        </div>
        {mode === 'image' && (
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-lg">
            <span className="font-semibold text-gray-900">Freeze GIFs</span>
            <button
              onClick={() => setGifsFrozen(!gifsFrozen)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${gifsFrozen ? 'bg-orange-600' : 'bg-gray-300'
                }`}
              role="switch"
              aria-checked={gifsFrozen}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${gifsFrozen ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>
        )}
        <button
          onClick={handleReset}
          className="w-full px-6 py-3 rounded-lg font-semibold text-lg transition-colors bg-gray-700 text-white hover:bg-gray-600 text-left"
        >
          Reset
        </button>
        <button
          onClick={handleNewGame}
          className="w-full px-6 py-3 rounded-lg font-semibold text-lg transition-colors bg-gray-700 text-white hover:bg-gray-600 text-left"
        >
          New Game
        </button>
      </InteractiveGameSettingsPanel>

      {/* Card Grid */}
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
          <Card
            key={card.id}
            card={card}
            mode={mode}
            size={cardSize}
            gifsFrozen={gifsFrozen}
            onClick={() => handleCardClick(card.id)}
          />
        ))}
      </div>
    </main>
  );
}

interface CardProps {
  card: { id: number; content: string; type: CardType; revealed: boolean };
  mode: 'word' | 'image';
  size: number;
  gifsFrozen: boolean;
  onClick: () => void;
}

function Card({ card, mode, size, gifsFrozen, onClick }: CardProps) {
  const isRevealed = card.revealed;
  const color = CARD_COLORS[card.type];
  const opacity = isRevealed ? 0.9 : 0;
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const isGif = mode === 'image' && card.content.toLowerCase().endsWith('.gif');

  // Capture frame when GIF needs to be frozen
  useEffect(() => {
    if (isGif && gifsFrozen && !frozenFrame) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          setFrozenFrame(canvas.toDataURL('image/png'));
        }
      };
      img.src = card.content;
    } else if (!gifsFrozen) {
      // Clear frozen frame when unfrozen
      setFrozenFrame(null);
    }
  }, [isGif, gifsFrozen, frozenFrame, card.content]);

  return (
    <div
      onClick={onClick}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: '#f5f5dc',
        border: '2px solid #333',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      }}
    >
      {/* Content */}
      {mode === 'word' ? (
        <span
          style={{
            fontSize: `${size * 0.15}px`,
            fontWeight: 'bold',
            color: '#000',
            textAlign: 'center',
            padding: '8px',
            zIndex: 2,
          }}
        >
          {mode === 'word' ? card.content.toUpperCase() : card.content}
        </span>
      ) : (
        <>
          {isGif && gifsFrozen && frozenFrame ? (
            <img
              src={frozenFrame}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: 1,
              }}
            />
          ) : (
            <img
              ref={imgRef}
              src={card.content}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: 1,
              }}
              onError={(e) => {
                // Hide broken images
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
        </>
      )}

      {/* Color Overlay */}
      {isRevealed && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: color,
            opacity,
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              color: '#fff',
              fontSize: `${size * 0.2}px`,
              fontWeight: 'bold',
              textTransform: 'uppercase',
            }}
          >
            {card.type}
          </span>
        </div>
      )}
    </div>
  );
}

export default function TableView() {
  return (
    <Suspense fallback={
      <main className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: '#fafafa' }}>
        <p className="text-2xl text-gray-600">Loading game...</p>
      </main>
    }>
      <TableViewContent />
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

