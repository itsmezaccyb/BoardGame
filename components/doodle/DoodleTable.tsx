'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { RevealViewer } from './RevealViewer';
import { useCountdown, useDoodleState } from './useDoodle';

/** Shared screen (TV or the table): join code, who's done, and the reveal. Read-only. */
export function DoodleTable() {
  const code = (useSearchParams().get('code') || '').toUpperCase();
  const { state, error, clockOffset } = useDoodleState(code || null, null);
  const secondsLeft = useCountdown(state, clockOffset);
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => setJoinUrl(`${window.location.host}/doodle-relay`), []);

  if (!code || (!state && error)) {
    return (
      <main className="h-dvh w-full flex flex-col items-center justify-center gap-4 bg-gray-950 text-white">
        <p className="text-2xl">{error || 'No game code given.'}</p>
        <Link href="/doodle-relay" className="underline text-violet-300">
          Back to Doodle Relay
        </Link>
      </main>
    );
  }
  if (!state) {
    return <main className="h-dvh w-full bg-gray-950" />;
  }

  const seated = state.players.filter((p) => state.status === 'lobby' || p.seat >= 0).sort((a, b) => a.seat - b.seat);
  const leader = state.players.find((p) => p.isLeader);

  if (state.status === 'reveal' && state.reveal) {
    return (
      <main className="h-dvh w-full overflow-y-auto bg-gradient-to-b from-violet-50 to-amber-50">
        <div className="min-h-full flex flex-col items-center justify-center px-10 py-8">
          <RevealViewer code={code} reveal={state.reveal} leaderName={leader?.name} large />
          <p className="text-gray-500 text-xl mt-6">{leader?.name ?? 'The leader'} flips the pages from their device</p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-dvh w-full overflow-hidden bg-gray-950 text-white flex flex-col items-center justify-center gap-12 px-10">
      <div className="text-center">
        <p className="text-3xl text-gray-400">Join at <span className="text-white font-semibold">{joinUrl}</span> with code</p>
        <p className="font-mono text-[10rem] leading-none font-extrabold tracking-[0.2em] text-violet-400 mt-4">{code}</p>
      </div>

      {state.status === 'playing' && (
        <div className="text-center">
          <p className="text-5xl font-bold">
            Round {state.round} of {state.totalRounds}: {state.round % 2 === 1 ? 'Drawing' : 'Guessing'}
          </p>
          {secondsLeft !== null && <p className={`font-mono text-6xl mt-4 ${secondsLeft <= 10 ? 'text-red-400' : 'text-gray-300'}`}>{secondsLeft}s</p>}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-4 max-w-6xl">
        {seated.length === 0 && <p className="text-3xl text-gray-500">Waiting for players…</p>}
        {seated.map((p) => (
          <span
            key={p.id}
            className={`px-6 py-3 rounded-full text-3xl font-semibold ${
              state.status === 'playing' ? (p.submitted ? 'bg-green-500 text-gray-950' : 'bg-gray-800 text-gray-400') : 'bg-gray-800 text-white'
            }`}
          >
            {state.status === 'playing' && (p.submitted ? '✓ ' : '')}
            {p.name}
            {p.isLeader && ' 👑'}
          </span>
        ))}
      </div>

      {state.status === 'lobby' && seated.length > 0 && (
        <p className="text-2xl text-gray-400">{leader?.name ?? 'The first player'} starts the game from their device</p>
      )}
    </main>
  );
}
