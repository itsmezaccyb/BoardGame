'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MAX_PROMPT_CHARS, MIN_PLAYERS, NO_GUESS, TIMER_OPTIONS, pickPrompts, type StateResponse, type Task } from '@/lib/doodle/game';
import { promptsFor } from '@/lib/doodle/prompts';
import { DrawingCanvas, type DrawingCanvasHandle } from './DrawingCanvas';
import { RevealViewer } from './RevealViewer';
import { api, storageGet, storageSet, tokenKey, useCountdown, useDoodleState, useDrawing } from './useDoodle';

function Shell({ children, wide, fit }: { children: React.ReactNode; wide?: boolean; fit?: boolean }) {
  // `fit` locks the page to the screen height so the drawing pad shrinks to
  // leave room for its tools and the Done button, instead of scrolling.
  return (
    <main className="h-dvh w-full overflow-y-auto bg-gradient-to-b from-violet-50 to-amber-50">
      <div className={`mx-auto w-full ${wide ? 'max-w-4xl' : 'max-w-xl'} px-4 ${fit ? 'py-3 h-full' : 'py-4 min-h-full'} flex flex-col`}>{children}</div>
    </main>
  );
}

function TimerPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-2">Time per turn</p>
      <div className="grid grid-cols-4 gap-2">
        {TIMER_OPTIONS.map((t) => (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`py-2 rounded-xl font-semibold border-2 ${value === t ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-gray-200 bg-white text-gray-700'}`}
          >
            {t === 0 ? 'Off' : `${t}s`}
          </button>
        ))}
      </div>
    </div>
  );
}

function PlayerChips({ state, showSubmitted }: { state: StateResponse; showSubmitted?: boolean }) {
  const seated = state.players.filter((p) => state.status === 'lobby' || p.seat >= 0).sort((a, b) => a.seat - b.seat);
  return (
    <div className="flex flex-wrap gap-2">
      {seated.map((p) => (
        <span
          key={p.id}
          className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
            showSubmitted ? (p.submitted ? 'bg-green-100 text-green-800' : 'bg-white text-gray-500 ring-1 ring-gray-200') : 'bg-white text-gray-800 ring-1 ring-gray-200'
          }`}
        >
          {showSubmitted && (p.submitted ? '✓ ' : '… ')}
          {p.name}
          {p.isLeader && ' 👑'}
          {p.id === state.me?.id && ' (you)'}
        </span>
      ))}
    </div>
  );
}

function CountdownBadge({ seconds }: { seconds: number | null }) {
  if (seconds === null) return null;
  const urgent = seconds <= 10;
  return (
    <span className={`px-3 py-1 rounded-full font-mono font-bold text-lg ${urgent ? 'bg-red-600 text-white animate-pulse' : 'bg-white text-gray-800 ring-1 ring-gray-200'}`}>
      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
    </span>
  );
}

function TaskView({
  code,
  task,
  secondsLeft,
  onSubmit,
}: {
  code: string;
  task: Task;
  secondsLeft: number | null;
  onSubmit: (content: string) => Promise<void>;
}) {
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const [guess, setGuess] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentRef = useRef(false);
  const drawing = useDrawing(code, task.drawingEntryId);

  const submit = async () => {
    if (sentRef.current) return;
    sentRef.current = true;
    setSending(true);
    setError(null);
    try {
      // An empty starting word is swapped for a random one by the server
      await onSubmit(task.kind === 'drawing' ? canvasRef.current?.getImage() ?? '' : task.kind === 'guess' ? guess.trim() || NO_GUESS : guess.trim());
    } catch (e) {
      sentRef.current = false;
      setError(e instanceof Error ? e.message : 'Could not send, try again');
    } finally {
      setSending(false);
    }
  };

  // Time's up: send whatever is on the page
  useEffect(() => {
    if (secondsLeft === 0) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  if (task.kind === 'prompt') {
    return (
      <form
        className="flex flex-col flex-1 gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">Write a word</p>
            <p className="text-gray-600">Type something for the next person to draw. Keep it secret!</p>
          </div>
          <CountdownBadge seconds={secondsLeft} />
        </div>
        <input
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          maxLength={MAX_PROMPT_CHARS}
          placeholder="e.g. Penguin on vacation"
          autoComplete="off"
          autoFocus
          className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 text-xl focus:border-amber-500 outline-none"
        />
        <button
          type="button"
          onClick={() => setGuess(pickPrompts(promptsFor(undefined), 1)[0])}
          className="self-start px-4 py-2 rounded-xl bg-white ring-1 ring-gray-300 text-gray-700 font-semibold"
        >
          🎲 Give me an idea
        </button>
        {error && <p className="text-red-600 text-center text-sm">{error}</p>}
        <button type="submit" disabled={sending || !guess.trim()} className="w-full py-4 rounded-2xl bg-amber-500 text-white font-bold text-xl disabled:opacity-50 mt-auto">
          {sending ? 'Sending…' : 'Pass it on'}
        </button>
      </form>
    );
  }

  if (task.kind === 'drawing') {
    return (
      <div className="flex flex-col flex-1 min-h-0 gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-violet-600">Draw this</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">{task.text}</p>
          </div>
          <CountdownBadge seconds={secondsLeft} />
        </div>
        <DrawingCanvas ref={canvasRef} disabled={sending} />
        {error && <p className="text-red-600 text-center text-sm">{error}</p>}
        <button onClick={submit} disabled={sending} className="w-full py-4 rounded-2xl bg-violet-600 text-white font-bold text-xl shrink-0 disabled:opacity-50">
          {sending ? 'Sending…' : 'Done drawing'}
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col flex-1 gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">What is this?</p>
          <p className="text-gray-600">Write down what you think was drawn.</p>
        </div>
        <CountdownBadge seconds={secondsLeft} />
      </div>
      <div className="aspect-square w-full max-w-[min(100%,55dvh)] mx-auto rounded-2xl bg-white shadow-lg ring-1 ring-black/10 overflow-hidden flex items-center justify-center">
        {drawing === undefined ? (
          <div className="animate-pulse text-gray-400">Loading drawing…</div>
        ) : drawing ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={drawing} alt="Drawing to guess" className="w-full h-full object-contain" />
        ) : (
          <p className="text-gray-400 italic px-6 text-center">They left the page blank. Make something up!</p>
        )}
      </div>
      <input
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        maxLength={80}
        placeholder="Your guess"
        autoComplete="off"
        className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 text-xl focus:border-sky-500 outline-none"
      />
      {error && <p className="text-red-600 text-center text-sm">{error}</p>}
      <button type="submit" disabled={sending} className="w-full py-4 rounded-2xl bg-sky-600 text-white font-bold text-xl disabled:opacity-50">
        {sending ? 'Sending…' : 'Submit guess'}
      </button>
    </form>
  );
}

export function DoodlePlayer() {
  const router = useRouter();
  const code = (useSearchParams().get('code') || '').toUpperCase();
  const [token, setToken] = useState<string | null>(null);
  const [checkedToken, setCheckedToken] = useState(false);
  const [timer, setTimer] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const t = code ? storageGet(tokenKey(code)) : null;
    if (!t) {
      router.replace(code ? `/doodle-relay?code=${code}` : '/doodle-relay');
      return;
    }
    setToken(t);
    setCheckedToken(true);
  }, [code, router]);

  const { state, error, clockOffset, refresh } = useDoodleState(checkedToken ? code : null, token);
  const secondsLeft = useCountdown(state, clockOffset);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  if (!state) {
    return (
      <Shell>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          {error ? (
            <>
              <p className="text-xl text-gray-800">{error}</p>
              <Link href="/doodle-relay" className="text-violet-700 font-semibold underline">
                Back to Doodle Relay
              </Link>
            </>
          ) : (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
          )}
        </div>
      </Shell>
    );
  }

  const me = state.me;
  if (!me) {
    return (
      <Shell>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-xl text-gray-800">You&rsquo;re no longer in game {code}.</p>
          <Link href={`/doodle-relay?code=${code}`} className="px-6 py-3 rounded-2xl bg-violet-600 text-white font-bold">
            Join again
          </Link>
        </div>
      </Shell>
    );
  }

  const leader = state.players.find((p) => p.isLeader);
  const chosenTimer = timer ?? state.timerSeconds;
  const startGame = () => run(() => api('start', { code, token, timerSeconds: chosenTimer }));
  const leave = () =>
    run(async () => {
      if (!confirm('Leave this game?')) return;
      await api(`players?${new URLSearchParams({ code, token: token! })}`, undefined, 'DELETE');
      storageSet(tokenKey(code), null);
      router.push('/doodle-relay');
    });

  const header = (
    <div className="flex items-center justify-between mb-2 shrink-0">
      <Link href="/" className="text-sm text-gray-500">
        ← Games
      </Link>
      <div className="text-sm text-gray-600">
        Game <span className="font-mono font-bold text-gray-900">{code}</span> · {me.name}
      </div>
    </div>
  );

  // ---------------- Lobby ----------------
  if (state.status === 'lobby') {
    const enough = state.players.length >= MIN_PLAYERS;
    return (
      <Shell>
        {header}
        <div className="flex-1 flex flex-col gap-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm text-center">
            <p className="text-gray-500">Others join at this site with the code</p>
            <p className="font-mono text-6xl font-extrabold tracking-widest text-violet-700 my-2">{code}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Players ({state.players.length})</p>
            <PlayerChips state={state} />
            <p className="text-xs text-gray-500 mt-2">Sketchbooks pass in this order, so it helps to join in the order you&rsquo;re sitting.</p>
          </div>
          {me.isLeader ? (
            <div className="flex flex-col gap-5 mt-auto">
              <TimerPicker value={chosenTimer} onChange={setTimer} />
              <button onClick={startGame} disabled={!enough || busy} className="w-full py-4 rounded-2xl bg-green-600 text-white font-bold text-xl disabled:opacity-40">
                {enough ? 'Start game' : `Need ${MIN_PLAYERS - state.players.length} more player${MIN_PLAYERS - state.players.length === 1 ? '' : 's'}`}
              </button>
            </div>
          ) : (
            <p className="text-center text-gray-600 mt-auto">Waiting for {leader?.name ?? 'the leader'} to start…</p>
          )}
          {actionError && <p className="text-red-600 text-center">{actionError}</p>}
          <button onClick={leave} disabled={busy} className="text-sm text-gray-500 underline self-center">
            Leave game
          </button>
        </div>
      </Shell>
    );
  }

  // ---------------- Playing ----------------
  if (state.status === 'playing') {
    const task = state.task;
    const roundLabel = (
      <p className="text-center text-sm text-gray-500 mb-2 shrink-0">
        {state.round === 0
          ? 'Everyone is writing a word'
          : `Round ${state.round} of ${state.totalRounds} · ${state.round % 2 === 1 ? 'Drawing' : 'Guessing'}`}
      </p>
    );

    if (task && !task.submitted) {
      return (
        <Shell fit={task.kind === 'drawing'}>
          {header}
          {roundLabel}
          <TaskView
            key={`${state.gameNumber}-${state.round}`}
            code={code}
            task={task}
            secondsLeft={secondsLeft}
            onSubmit={async (content) => {
              await api('submit', { code, token, round: task.round, content });
              await refresh();
            }}
          />
        </Shell>
      );
    }

    const waitingOn = state.players.filter((p) => p.seat >= 0 && !p.submitted);
    return (
      <Shell>
        {header}
        {roundLabel}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
          {me.seat < 0 ? (
            <p className="text-xl text-gray-700">A game is in progress. You&rsquo;ll be dealt in next game.</p>
          ) : (
            <>
              <div className="text-6xl">🎨</div>
              <p className="text-2xl font-bold text-gray-900">Sent! Passing the sketchbook…</p>
            </>
          )}
          <p className="text-gray-600">
            Waiting on {waitingOn.map((p) => p.name).join(', ') || 'everyone'}
            {secondsLeft !== null && ` · ${secondsLeft}s left`}
          </p>
          <PlayerChips state={state} showSubmitted />
          {me.isLeader && waitingOn.length > 0 && (
            <button
              onClick={() => {
                if (confirm(`Move on without ${waitingOn.map((p) => p.name).join(', ')}? ${state.round === 0 ? "They'll get a random word." : "They'll pass along a blank page."}`)) {
                  run(() => api('skip', { code, token, round: state.round }));
                }
              }}
              disabled={busy}
              className="px-5 py-3 rounded-2xl bg-white ring-1 ring-gray-300 text-gray-700 font-semibold"
            >
              Move on without them
            </button>
          )}
          {actionError && <p className="text-red-600">{actionError}</p>}
        </div>
      </Shell>
    );
  }

  // ---------------- Reveal ----------------
  const reveal = state.reveal!;
  const finished = reveal.book >= reveal.bookCount - 1 && reveal.step >= reveal.steps.length - 1;
  return (
    <Shell wide>
      {header}
      <div className="flex-1 flex flex-col gap-6 pb-4">
        <RevealViewer
          code={code}
          reveal={reveal}
          leaderName={leader?.name}
          onNavigate={me.isLeader ? (book, step) => run(() => api('reveal', { code, token, book, step })) : undefined}
        />
        {me.isLeader && finished && (
          <div className="rounded-3xl bg-white p-5 shadow-sm flex flex-col gap-4 max-w-md w-full self-center">
            <p className="text-center font-bold text-lg">That&rsquo;s every sketchbook!</p>
            <TimerPicker value={chosenTimer} onChange={setTimer} />
            <button onClick={startGame} disabled={busy || state.players.length < MIN_PLAYERS} className="w-full py-4 rounded-2xl bg-green-600 text-white font-bold text-xl disabled:opacity-40">
              Play again
            </button>
            {state.players.length < MIN_PLAYERS && <p className="text-center text-sm text-gray-500">Need at least {MIN_PLAYERS} players.</p>}
          </div>
        )}
        {actionError && <p className="text-red-600 text-center">{actionError}</p>}
        {/* Room for the page buttons pinned to the bottom of the screen */}
        {me.isLeader && <div className="h-24 shrink-0" aria-hidden />}
      </div>
    </Shell>
  );
}
