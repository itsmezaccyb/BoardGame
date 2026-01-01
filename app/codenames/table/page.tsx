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

interface CardStackIndicatorProps {
  team: 'red' | 'blue';
  count: number;
  total: number;
  cardSize: number;
  rotation: number;
}

function CardStackIndicator({ team, count, total, cardSize, rotation }: CardStackIndicatorProps) {
  const color = CARD_COLORS[team];
  const stackOffset = cardSize * 0.08; // Smaller offset for square cards

  // Always show at least 1 card (the bottom/fixed card), and up to 5 cards total
  const visibleCards = Math.min(5, Math.max(1, count || 1));
  // Calculate how many cards are above the bottom card
  const cardsAboveBottom = Math.max(0, visibleCards - 1);

  return (
    <div className="flex flex-col items-center">
      {/* Card Stack */}
      <div
        className="relative"
        style={{
          width: cardSize,
          height: cardSize + cardsAboveBottom * stackOffset,
          transform: `rotate(${rotation}deg)`
        }}
      >
        {/* Bottom card (always visible, stays in place) */}
        <div
          className="absolute border-2 rounded-lg flex items-center justify-center font-bold text-white"
          style={{
            width: cardSize,
            height: cardSize,
            backgroundColor: count === 0 ? 'transparent' : color,
            borderColor: team === 'red' ? '#b71c1c' : '#0d47a1',
            top: 0,
            left: 0,
            zIndex: 1,
            boxShadow: count === 0 ? 'none' : '0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          {count === 1 ? (
            <span style={{ fontSize: `${cardSize * 0.35}px`, fontWeight: 'bold' }}>
              {count}
            </span>
          ) : null}
        </div>

        {/* Cards above bottom card */}
        {Array.from({ length: cardsAboveBottom }).map((_, index) => {
          const cardIndex = index + 1; // Start from 1 since 0 is the bottom card
          const isTopCard = cardIndex === visibleCards - 1;
          return (
            <div
              key={cardIndex}
              className="absolute border-2 rounded-lg flex items-center justify-center font-bold text-white"
              style={{
                width: cardSize,
                height: cardSize,
                backgroundColor: color,
                borderColor: team === 'red' ? '#b71c1c' : '#0d47a1',
                top: cardIndex * stackOffset,
                left: cardIndex * (stackOffset * 0.5),
                zIndex: cardIndex + 1,
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              {isTopCard ? (
                <span style={{ fontSize: `${cardSize * 0.35}px`, fontWeight: 'bold' }}>
                  {count}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TableViewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [gifsFrozen, setGifsFrozen] = useState(true);
  const [jumboView, setJumboView] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [showWordsTwice, setShowWordsTwice] = useState(false);
  const [cardRotation, setCardRotation] = useState(0); // 0, 90, 180, 270 degrees

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

  // Calculate remaining cards for each team
  const remainingCards = useMemo(() => {
    if (!gameState) return { red: 0, blue: 0, neutral: 0, assassin: 1 };

    const unrevealed = gameState.cards.filter(card => !card.revealed);
    return {
      red: unrevealed.filter(card => card.type === 'red').length,
      blue: unrevealed.filter(card => card.type === 'blue').length,
      neutral: unrevealed.filter(card => card.type === 'neutral').length,
      assassin: unrevealed.filter(card => card.type === 'assassin').length,
    };
  }, [gameState]);

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
        {mode === 'word' && (
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-lg">
            <span className="font-semibold text-gray-900">Show Words Twice</span>
            <button
              onClick={() => setShowWordsTwice(!showWordsTwice)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${showWordsTwice ? 'bg-green-600' : 'bg-gray-300'
                }`}
              role="switch"
              aria-checked={showWordsTwice}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showWordsTwice ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>
        )}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-lg">
          <span className="font-semibold text-gray-900">Rotate Cards ({cardRotation}°)</span>
          <button
            onClick={() => setCardRotation((prev) => (prev + 90) % 360)}
            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
          >
            ↻°
          </button>
        </div>
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

      {/* Game Board with Card Indicators */}
      <div className="flex items-center justify-center gap-8">
        {/* Red Team Card Stack (Left Side) */}
        <CardStackIndicator
          team="red"
          count={remainingCards.red}
          total={gameState.startingTeam === 'red' ? 9 : 8}
          cardSize={cardSize}
          rotation={cardRotation}
        />

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
              showWordsTwice={showWordsTwice}
              cardRotation={cardRotation}
              onClick={() => handleCardClick(card.id)}
            />
          ))}
        </div>

        {/* Blue Team Card Stack (Right Side) */}
        <CardStackIndicator
          team="blue"
          count={remainingCards.blue}
          total={gameState.startingTeam === 'blue' ? 9 : 8}
          cardSize={cardSize}
          rotation={cardRotation}
        />
      </div>
    </main>
  );
}

interface CardProps {
  card: { id: number; content: string; type: CardType; revealed: boolean };
  mode: 'word' | 'image';
  size: number;
  gifsFrozen: boolean;
  showWordsTwice: boolean;
  cardRotation: number;
  onClick: () => void;
}

function Card({ card, mode, size, gifsFrozen, showWordsTwice, cardRotation, onClick }: CardProps) {
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
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `rotate(${cardRotation}deg)`,
            zIndex: 2,
          }}
        >
          {showWordsTwice ? (
            <>
              <span
                style={{
                  fontSize: `${size * 0.13}px`,
                  fontWeight: 'bold',
                  color: '#000',
                  textAlign: 'center',
                  lineHeight: '1',
                  marginBottom: '13px',
                  transform: 'rotate(180deg)',
                }}
              >
                {card.content.toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: `${size * 0.13}px`,
                  fontWeight: 'bold',
                  color: '#000',
                  textAlign: 'center',
                  lineHeight: '1',
                }}
              >
                {card.content.toUpperCase()}
              </span>
            </>
          ) : (
            <span
              style={{
                fontSize: `${size * 0.15}px`,
                fontWeight: 'bold',
                color: '#000',
                textAlign: 'center',
                padding: '8px',
              }}
            >
              {card.content.toUpperCase()}
            </span>
          )}
        </div>
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
                transform: `rotate(${cardRotation}deg)`,
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
                transform: `rotate(${cardRotation}deg)`,
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


