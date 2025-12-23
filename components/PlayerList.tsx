'use client';

import { type GameState } from '@/lib/chameleon/game';

interface Player {
  id: string;
  player_id: string;
  player_name: string;
  join_order: number;
  is_leader: boolean;
}

interface PlayerListProps {
  players: Player[];
  gameState: GameState | null;
  currentPlayerId?: string;
}

export default function PlayerList({ players, gameState, currentPlayerId }: PlayerListProps) {
  if (!players || players.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">No players yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Players ({players.length})</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {players.map((player) => {
          const isCurrent = currentPlayerId === player.player_id;
          const isChameleon = gameState?.chameleon_player_id === player.id;

          return (
            <div
              key={player.id}
              className={`p-3 rounded-lg border-2 transition-colors ${
                isCurrent
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-gray-600">#{player.join_order}</span>
                  <span className="font-semibold text-gray-800">{player.player_name}</span>
                  {isCurrent && <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">You</span>}
                </div>
                <div className="flex gap-2">
                  {player.is_leader && (
                    <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      👑 Leader
                    </span>
                  )}
                  {gameState && isChameleon && (
                    <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      🦎 Chameleon
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
