'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LAST_CODE_KEY, NAME_KEY, api, storageGet, storageSet, tokenKey } from './useDoodle';

export function DoodleLobby() {
  const router = useRouter();
  const presetCode = (useSearchParams().get('code') || '').toUpperCase();
  const [name, setName] = useState('');
  const [code, setCode] = useState(presetCode);
  const [resume, setResume] = useState<string | null>(null);
  const [busy, setBusy] = useState<'join' | 'create' | 'table' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(storageGet(NAME_KEY) || '');
    const last = storageGet(LAST_CODE_KEY);
    if (last && storageGet(tokenKey(last))) setResume(last);
  }, []);

  const enter = (gameCode: string, token: string) => {
    storageSet(tokenKey(gameCode), token);
    storageSet(LAST_CODE_KEY, gameCode);
    storageSet(NAME_KEY, name.trim());
    router.push(`/doodle-relay/play?code=${gameCode}`);
  };

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('join');
    setError(null);
    try {
      const res = await api<{ code: string; token: string }>('players', { code: code.trim(), playerName: name });
      enter(res.code, res.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join');
      setBusy(null);
    }
  };

  const create = async () => {
    if (!name.trim()) {
      setError('Enter your name first');
      return;
    }
    setBusy('create');
    setError(null);
    try {
      const res = await api<{ code: string; token: string }>('sessions', { playerName: name });
      enter(res.code, res.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create a game');
      setBusy(null);
    }
  };

  const createForTable = async () => {
    setBusy('table');
    setError(null);
    try {
      const res = await api<{ code: string }>('sessions', {});
      router.push(`/doodle-relay/table?code=${res.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create a game');
      setBusy(null);
    }
  };

  return (
    <main className="h-dvh w-full overflow-y-auto bg-gradient-to-b from-violet-50 to-amber-50">
      <div className="mx-auto max-w-md px-4 py-6 flex flex-col gap-6">
        <Link href="/" className="text-sm text-gray-500">
          ← Games
        </Link>
        <div className="text-center">
          <div className="text-6xl mb-2">✏️</div>
          <h1 className="text-4xl font-extrabold text-gray-900">Doodle Relay</h1>
          <p className="text-gray-600 mt-2">
            Everyone gets a secret word. Draw it, pass it, guess what the last person drew, pass it again. Then flip through every sketchbook together and
            see how far it drifted.
          </p>
        </div>

        {resume && (
          <button onClick={() => router.push(`/doodle-relay/play?code=${resume}`)} className="w-full py-3 rounded-2xl bg-violet-100 text-violet-800 font-semibold">
            Back to game {resume}
          </button>
        )}

        <form onSubmit={join} className="rounded-3xl bg-white p-5 shadow-sm flex flex-col gap-3">
          <label className="text-sm font-semibold text-gray-700">
            Your name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="e.g. Sam"
              autoComplete="nickname"
              className="mt-1 w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-lg outline-none focus:border-violet-500 font-normal"
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Game code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="ABCD"
              autoCapitalize="characters"
              autoComplete="off"
              className="mt-1 w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-2xl font-mono tracking-[0.4em] uppercase outline-none focus:border-violet-500"
            />
          </label>
          <button type="submit" disabled={!name.trim() || code.trim().length !== 4 || busy !== null} className="w-full py-4 rounded-2xl bg-violet-600 text-white font-bold text-lg disabled:opacity-40">
            {busy === 'join' ? 'Joining…' : 'Join game'}
          </button>
          <div className="flex items-center gap-3 text-gray-400 text-sm">
            <span className="flex-1 h-px bg-gray-200" />
            or
            <span className="flex-1 h-px bg-gray-200" />
          </div>
          <button type="button" onClick={create} disabled={busy !== null} className="w-full py-4 rounded-2xl bg-green-600 text-white font-bold text-lg disabled:opacity-40">
            {busy === 'create' ? 'Creating…' : 'Start a new game'}
          </button>
        </form>

        {error && <p className="text-red-600 text-center">{error}</p>}

        <button onClick={createForTable} disabled={busy !== null} className="text-sm text-gray-600 underline self-center">
          {busy === 'table' ? 'Setting up…' : 'Show a game on the TV / table screen instead'}
        </button>
      </div>
    </main>
  );
}
