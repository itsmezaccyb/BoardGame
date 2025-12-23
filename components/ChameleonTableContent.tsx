'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { loadGameStateFromServer, type GameState } from '@/lib/chameleon/game';
import ChameleonGrid from '@/components/ChameleonGrid';
import { InteractiveGameSettingsPanel } from '@/components/InteractiveGameSettingsPanel';
import { inchesToPixels } from '@/lib/dimensions';

export function ChameleonTableContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');
  const mode = (searchParams.get('mode') || 'word') as 'word' | 'image';

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [jumboView, setJumboView] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!code) {
      router.push('/chameleon');
      return;
    }

    // Load initial state
    const loadState = async () => {
      const state = await loadGameStateFromServer(code);
      if (state) {
        setGameState(state);
        console.log('✅ [Table View] Loaded game state');
      }
      setIsLoading(false);
    };

    loadState();

    // Poll for updates every 1 second
    const interval = setInterval(async () => {
      const state = await loadGameStateFromServer(code);
      if (state) {
        setGameState(state);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [code, router]);

  // Handle window resize for jumbo view
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading && !gameState) {
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
          <p className="text-2xl text-gray-600 mb-4">Waiting for game to start...</p>
          <p className="text-gray-500">Game Code: <span className="font-mono font-bold">{code}</span></p>
        </div>
      </main>
    );
  }

  // Calculate card size based on jumbo view
  const gap = inchesToPixels(0.2);
  const cardSize = jumboView && windowSize.height > 0
    ? Math.min(
      (windowSize.height - 120) / 4 - gap, // 4x4 grid, use most of screen height
      windowSize.width / 4 - gap // Don't exceed screen width
    )
    : inchesToPixels(2.5); // Normal view: 2.5 inches per card

  return (
    <main className="h-screen w-screen flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: '#fafafa' }}>
      <div className="flex flex-col items-center justify-center h-full">
        {/* Game Info */}
        <div className="mb-4 text-center">
          <p className="text-lg text-gray-700">
            Code: <span className="font-mono font-bold text-2xl">{code}</span>
          </p>
          <p className="text-sm text-gray-600">Round {gameState.round_number}</p>
        </div>

        {/* Grid */}
        <ChameleonGrid
          items={gameState.grid_items}
          mode={gameState.mode}
          size={cardSize}
        />
      </div>

      {/* Settings Panel */}
      <InteractiveGameSettingsPanel>
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            Game Code: <span className="font-bold text-gray-900">{code}</span>
          </p>
        </div>

        {/* Jumbo View Toggle */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-lg">
          <span className="font-semibold text-gray-900">Jumbo View</span>
          <button
            onClick={() => setJumboView(!jumboView)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${jumboView ? 'bg-green-600' : 'bg-gray-300'}`}
            role="switch"
            aria-checked={jumboView}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${jumboView ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>

        <button
          onClick={() => router.push('/chameleon')}
          className="w-full px-6 py-3 rounded-lg font-semibold text-lg transition-colors bg-gray-700 text-white hover:bg-gray-600 text-left"
        >
          Return to Lobby
        </button>
      </InteractiveGameSettingsPanel>
    </main>
  );
}
