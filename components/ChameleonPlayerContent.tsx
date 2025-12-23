'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { type GameState } from '@/lib/chameleon/game';
import { InteractiveGameSettingsPanel } from '@/components/InteractiveGameSettingsPanel';

interface Player {
  id: string;
  player_name: string;
  player_id: string;
  join_order: number;
  is_leader: boolean;
}

export function ChameleonPlayerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');
  const playerId = searchParams.get('playerId');

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!code || !playerId) {
      router.push('/chameleon');
      return;
    }

    // Load initial state
    const loadState = async () => {
      try {
        const response = await fetch(`/api/chameleon/game-sessions?code=${code}`);
        const result = await response.json();

        if (response.ok && result.session) {
          setGameState(result.session.game_state);
          setPlayers(result.players || []);
          const current = result.players?.find((p: Player) => p.player_id === playerId);
          setCurrentPlayer(current || null);
          console.log('✅ [Player View] Loaded game state');
        }
      } catch (error) {
        console.error('Error loading game state:', error);
      }
      setIsLoading(false);
    };

    loadState();

    // Poll for updates every 1 second
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/chameleon/game-sessions?code=${code}`);
        const result = await response.json();

        if (response.ok && result.session) {
          setGameState(result.session.game_state);
          setPlayers(result.players || []);
          const current = result.players?.find((p: Player) => p.player_id === playerId);
          setCurrentPlayer(current || null);
        }
      } catch (error) {
        console.error('Error polling game state:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [code, playerId, router]);

  const handleLeaveGame = async () => {
    if (!confirm('Are you sure you want to leave the game?')) return;

    try {
      console.log('👋 [Player View] Leaving game...');
      const response = await fetch(`/api/chameleon/players?playerId=${playerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log('✅ [Player View] Left game');
        router.push('/chameleon');
      } else {
        alert('Failed to leave game');
      }
    } catch (error) {
      console.error('Error leaving game:', error);
      alert('Error leaving game');
    }
  };

  const handleStartGame = async () => {
    if (!code || !playerId) return;

    try {
      console.log('🎮 [Player View] Starting game...');
      const response = await fetch('/api/chameleon/start-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCode: code,
          playerId: playerId,
          roundNumber: 1,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ [Player View] Game started');
        setGameState(result.round);
      } else {
        console.error('❌ [Player View] Failed to start game:', result.error);
        alert(`Failed to start game: ${result.error}`);
      }
    } catch (error) {
      console.error('💥 [Player View] Error starting game:', error);
      alert('Error starting game');
    }
  };

  const handleNewRound = async () => {
    if (!code || !playerId) return;

    try {
      console.log('🎮 [Player View] Starting new round...');
      const currentRound = gameState?.round_number || 1;
      const response = await fetch('/api/chameleon/start-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCode: code,
          playerId: playerId,
          roundNumber: currentRound + 1,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ [Player View] New round started');
        setGameState(result.round);
      } else {
        console.error('❌ [Player View] Failed to start new round:', result.error);
        alert(`Failed to start new round: ${result.error}`);
      }
    } catch (error) {
      console.error('💥 [Player View] Error starting new round:', error);
      alert('Error starting new round');
    }
  };

  const isChameleon = currentPlayer && gameState && gameState.chameleon_player_id === currentPlayer.id;
  const secretWord = gameState && !isChameleon ? gameState.secret_word : null;

  if (isLoading) {
    return (
      <main className="h-screen w-screen flex flex-col items-center justify-center" style={{ backgroundColor: '#fafafa' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Loading game...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen w-screen flex flex-col items-center justify-center" style={{ backgroundColor: '#fafafa' }}>
      <div className="w-full max-w-2xl px-8">
        {/* Role Display */}
        <div className="text-center">
          {!gameState ? (
            <div className="bg-gray-100 rounded-lg p-12 mb-8">
              <p className="text-gray-700 text-xl mb-6">Waiting for game to start...</p>
              {currentPlayer?.is_leader && (
                <button
                  onClick={handleStartGame}
                  className="px-10 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-xl"
                >
                  Start Game
                </button>
              )}
            </div>
          ) : (
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-12 mb-8 border-4 border-purple-300">
              {isChameleon ? (
                <div>
                  <p className="text-3xl font-bold text-purple-800 mb-3">🦎 You are the Chameleon!</p>
                  <p className="text-gray-700 text-lg">Blend in and find the secret word!</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Your Word:</p>
                  <p className="text-6xl font-bold text-blue-700">{secretWord}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Leader Controls */}
        {currentPlayer?.is_leader && (
          <div className="text-center mt-8">
            {!gameState ? (
              <p className="text-gray-600 text-sm mb-4">As the leader, you can start the game above</p>
            ) : (
              <>
                <button
                  onClick={handleNewRound}
                  className="px-10 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold text-xl"
                >
                  New Round
                </button>
                <p className="text-gray-600 text-sm mt-4">Click to start the next round</p>
              </>
            )}
          </div>
        )}

      </div>

      {/* Settings Panel */}
      <InteractiveGameSettingsPanel>
        <div className="border-b border-gray-300 pb-4 mb-4">
          <label className="block text-sm font-semibold text-gray-800 mb-2">Game Info</label>
          <div className="space-y-2 text-sm text-gray-700">
            <p><span className="font-semibold">Code:</span> <span className="font-mono">{code}</span></p>
            <p><span className="font-semibold">Mode:</span> {gameState?.mode === 'word' ? 'Words' : 'Images'}</p>
            <p><span className="font-semibold">Players:</span> {players.length}/8</p>
            {currentPlayer && (
              <p><span className="font-semibold">Your Role:</span> {currentPlayer.is_leader ? '👑 Leader' : 'Player'}</p>
            )}
            {gameState && <p><span className="font-semibold">Round:</span> {gameState.round_number}</p>}
          </div>
        </div>

        <button
          onClick={() => router.push(`/chameleon/table?code=${code}&mode=${gameState?.mode || 'word'}`)}
          className="w-full px-6 py-3 rounded-lg font-semibold text-lg transition-colors bg-blue-600 text-white hover:bg-blue-700 mb-2"
        >
          View Table
        </button>

        <button
          onClick={handleLeaveGame}
          className="w-full px-6 py-3 rounded-lg font-semibold text-lg transition-colors bg-red-600 text-white hover:bg-red-700"
        >
          Leave Game
        </button>
      </InteractiveGameSettingsPanel>
    </main>
  );
}
