'use client';

import { useEffect } from 'react';
import type { RevealState, RevealStep } from '@/lib/doodle/game';
import { prefetchDrawings, useDrawing } from './useDoodle';

interface Props {
  code: string;
  reveal: RevealState;
  /** Shown when the reader isn't the one flipping pages. */
  leaderName?: string;
  /** Present only for the leader: moves every screen to that page. */
  onNavigate?: (book: number, step: number) => void;
  /** Bigger type and a side-by-side layout for a TV. */
  large?: boolean;
}

function Page({ code, entry, large, faded }: { code: string; entry: RevealStep; large?: boolean; faded?: boolean }) {
  const src = useDrawing(code, entry.kind === 'drawing' ? entry.entryId : undefined);
  const caption =
    entry.kind === 'prompt' ? 'The word was' : entry.kind === 'drawing' ? `${entry.authorName ?? 'Someone'} drew` : `${entry.authorName ?? 'Someone'} guessed`;

  return (
    <div className={`flex flex-col items-center gap-3 w-full ${faded ? 'opacity-60' : ''}`}>
      <p className={`font-semibold uppercase tracking-wide text-gray-500 ${large ? 'text-2xl' : 'text-sm'}`}>{caption}</p>
      {entry.kind === 'drawing' ? (
        <div
          className="aspect-square w-full rounded-2xl bg-white shadow-lg ring-1 ring-black/10 overflow-hidden flex items-center justify-center"
          style={{ maxWidth: large ? 'min(42vw, 70vh)' : 'min(100%, 55vh)' }}
        >
          {src === undefined ? (
            <div className="animate-pulse text-gray-400">Loading…</div>
          ) : src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={`Drawing by ${entry.authorName ?? 'someone'}`} className="w-full h-full object-contain" />
          ) : (
            <p className="text-gray-400 italic">(left blank)</p>
          )}
        </div>
      ) : (
        <div
          className={`w-full rounded-2xl px-6 py-8 text-center font-bold break-words shadow-lg ${
            entry.kind === 'prompt' ? 'bg-amber-100 text-amber-900' : 'bg-sky-100 text-sky-900'
          } ${large ? 'text-6xl py-16' : 'text-3xl'}`}
          style={{ maxWidth: large ? 'min(42vw, 70vh)' : undefined }}
        >
          {entry.text}
        </div>
      )}
    </div>
  );
}

export function RevealViewer({ code, reveal, leaderName, onNavigate, large }: Props) {
  const { book, step, bookCount, steps, ownerName } = reveal;
  const lastStep = steps.length - 1;
  const entry = steps[Math.min(step, lastStep)];
  const previous = step > 0 ? steps[step - 1] : undefined;
  const atEndOfBook = step >= lastStep;
  const atVeryEnd = atEndOfBook && book >= bookCount - 1;

  // Load the whole book's drawings up front so flipping is instant
  useEffect(() => {
    prefetchDrawings(code, steps.filter((s) => s.kind === 'drawing').map((s) => s.entryId));
  }, [code, steps]);

  const next = () => {
    if (!onNavigate) return;
    if (!atEndOfBook) onNavigate(book, step + 1);
    else if (!atVeryEnd) onNavigate(book + 1, 0);
  };
  const prev = () => {
    if (!onNavigate) return;
    if (step > 0) onNavigate(book, step - 1);
    else if (book > 0) onNavigate(book - 1, 0);
  };

  // Arrow keys / space for a leader on a computer
  useEffect(() => {
    if (!onNavigate) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!entry) return null;
  const first = steps[0];
  const final = steps[lastStep];

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <div className="text-center">
        <p className={`text-gray-500 ${large ? 'text-2xl' : 'text-sm'}`}>
          Sketchbook {book + 1} of {bookCount}
        </p>
        <h2 className={`font-extrabold text-gray-900 ${large ? 'text-6xl' : 'text-2xl'}`}>{ownerName}&rsquo;s sketchbook</h2>
        <div className="flex justify-center gap-1.5 mt-3">
          {steps.map((s) => (
            <span
              key={s.step}
              className={`rounded-full transition-all ${large ? 'h-3' : 'h-2'} ${
                s.step === step ? `bg-gray-900 ${large ? 'w-10' : 'w-6'}` : s.step < step ? `bg-gray-500 ${large ? 'w-3' : 'w-2'}` : `bg-gray-300 ${large ? 'w-3' : 'w-2'}`
              }`}
            />
          ))}
        </div>
      </div>

      <div className={`w-full flex ${large ? 'flex-row items-start justify-center gap-10' : 'flex-col items-center gap-4'}`}>
        {large && previous && <Page code={code} entry={previous} large faded />}
        <Page key={entry.entryId} code={code} entry={entry} large={large} />
      </div>

      {atEndOfBook && steps.length > 1 && (
        <div className={`rounded-2xl bg-gradient-to-r from-amber-100 to-sky-100 px-6 py-4 text-center ${large ? 'text-3xl' : 'text-base'}`}>
          Started as <b>{first.text}</b>
          {final.kind === 'guess' ? (
            <>
              {' '}
              → ended as <b>{final.text}</b>
            </>
          ) : (
            ' → ended as that drawing'
          )}
        </div>
      )}

      {onNavigate ? (
        <div className="flex gap-3 w-full max-w-md">
          <button
            onClick={prev}
            disabled={book === 0 && step === 0}
            className="flex-1 py-4 rounded-2xl bg-gray-200 text-gray-800 font-bold text-lg disabled:opacity-40"
          >
            ← Back
          </button>
          <button
            onClick={next}
            disabled={atVeryEnd}
            className="flex-[2] py-4 rounded-2xl bg-violet-600 text-white font-bold text-lg disabled:opacity-40"
          >
            {atEndOfBook ? (atVeryEnd ? 'That was the last one' : 'Next sketchbook →') : 'Next page →'}
          </button>
        </div>
      ) : (
        !large && <p className="text-gray-500 text-sm">{leaderName ?? 'The leader'} is flipping the pages</p>
      )}
    </div>
  );
}
