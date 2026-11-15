'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { CANVAS_SIZE } from '@/lib/doodle/game';

const COLORS = ['#111827', '#6b7280', '#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#92400e', '#f472b6'];
const SIZES = [{ px: 4, dot: 6 }, { px: 10, dot: 12 }, { px: 24, dot: 20 }];
const BACKGROUND = '#ffffff';

type Stroke = { type: 'stroke'; color: string; size: number; points: [number, number][] };
type Action = Stroke | { type: 'clear' };

export interface DrawingCanvasHandle {
  /** JPEG data URL of the drawing, or '' if the page is blank. */
  getImage: () => string;
}

/**
 * A square sketch pad that works with fingers, an Apple Pencil or a mouse.
 * It draws at a fixed 640×640 internally and scales to fit its container.
 */
export const DrawingCanvas = forwardRef<DrawingCanvasHandle, { disabled?: boolean }>(function DrawingCanvas(
  { disabled },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const actions = useRef<Action[]>([]);
  const current = useRef<Stroke | null>(null);
  const [displaySize, setDisplaySize] = useState(0);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1].px);
  const [erasing, setErasing] = useState(false);
  const [actionCount, setActionCount] = useState(0);

  // Fit the square canvas to whatever space the layout gives us
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDisplaySize(Math.floor(Math.min(width, height)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ctx = () => canvasRef.current?.getContext('2d') ?? null;

  const drawStroke = (c: CanvasRenderingContext2D, s: Stroke) => {
    c.strokeStyle = s.color;
    c.fillStyle = s.color;
    c.lineWidth = s.size;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const pts = s.points;
    if (pts.length === 1) {
      c.beginPath();
      c.arc(pts[0][0], pts[0][1], s.size / 2, 0, Math.PI * 2);
      c.fill();
      return;
    }
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    // Smooth through midpoints so fast finger strokes don't look jagged
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const last = pts[pts.length - 1];
    c.lineTo(last[0], last[1]);
    c.stroke();
  };

  const redraw = useCallback(() => {
    const c = ctx();
    if (!c) return;
    c.fillStyle = BACKGROUND;
    c.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    let start = 0;
    actions.current.forEach((a, i) => {
      if (a.type === 'clear') start = i + 1;
    });
    for (const a of actions.current.slice(start)) if (a.type === 'stroke') drawStroke(c, a);
  }, []);

  useEffect(redraw, [redraw]);

  const isBlank = () => {
    const list = actions.current;
    const lastClear = list.map((a) => a.type).lastIndexOf('clear');
    return !list.slice(lastClear + 1).some((a) => a.type === 'stroke' && a.color !== BACKGROUND);
  };

  useImperativeHandle(ref, () => ({
    getImage: () => (isBlank() ? '' : canvasRef.current?.toDataURL('image/jpeg', 0.8) ?? ''),
  }));

  const toCanvas = (e: { clientX: number; clientY: number }): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
      ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
    ];
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const stroke: Stroke = { type: 'stroke', color: erasing ? BACKGROUND : color, size: erasing ? size * 2 : size, points: [toCanvas(e)] };
    current.current = stroke;
    actions.current.push(stroke);
    const c = ctx();
    if (c) drawStroke(c, stroke);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const stroke = current.current;
    const c = ctx();
    if (!stroke || !c) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    for (const ev of events.length ? events : [e.nativeEvent]) {
      const prev = stroke.points[stroke.points.length - 1];
      const next = toCanvas(ev);
      stroke.points.push(next);
      // Draw just the new segment live; the smoothed version appears on redraw
      c.strokeStyle = stroke.color;
      c.lineWidth = stroke.size;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(prev[0], prev[1]);
      c.lineTo(next[0], next[1]);
      c.stroke();
    }
  };

  const onPointerUp = () => {
    if (!current.current) return;
    current.current = null;
    redraw();
    setActionCount(actions.current.length);
  };

  const undo = () => {
    actions.current.pop();
    redraw();
    setActionCount(actions.current.length);
  };

  const clear = () => {
    if (isBlank()) return;
    actions.current.push({ type: 'clear' });
    redraw();
    setActionCount(actions.current.length);
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-3 flex-1 min-h-0 w-full">
      <div ref={wrapRef} className="flex-1 min-h-[160px] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onContextMenu={(e) => e.preventDefault()}
          className="rounded-2xl shadow-lg bg-white ring-1 ring-black/10"
          style={{
            width: displaySize || '100%',
            height: displaySize || 'auto',
            touchAction: 'none',
            cursor: disabled ? 'not-allowed' : 'crosshair',
            opacity: disabled ? 0.6 : 1,
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 shrink-0">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            onClick={() => {
              setColor(c);
              setErasing(false);
            }}
            className="w-7 h-7 sm:w-9 sm:h-9 rounded-full border-2 transition-transform"
            style={{
              backgroundColor: c,
              borderColor: !erasing && color === c ? '#111827' : 'white',
              transform: !erasing && color === c ? 'scale(1.15)' : undefined,
              boxShadow: '0 0 0 1px rgba(0,0,0,0.15)',
            }}
          />
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 shrink-0">
        {SIZES.map((s) => (
          <button
            key={s.px}
            type="button"
            aria-label={`Brush size ${s.px}`}
            onClick={() => setSize(s.px)}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border-2 ${size === s.px ? 'border-gray-900 bg-gray-100' : 'border-gray-200 bg-white'}`}
          >
            <span className="rounded-full bg-gray-900" style={{ width: s.dot, height: s.dot }} />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setErasing((v) => !v)}
          className={`h-10 sm:h-11 px-3 rounded-xl border-2 font-semibold text-sm ${erasing ? 'border-gray-900 bg-gray-100' : 'border-gray-200 bg-white'}`}
        >
          Eraser
        </button>
        <button
          type="button"
          onClick={undo}
          disabled={actionCount === 0}
          className="h-10 sm:h-11 px-3 rounded-xl border-2 border-gray-200 bg-white font-semibold text-sm disabled:opacity-40"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={actionCount === 0}
          className="h-10 sm:h-11 px-3 rounded-xl border-2 border-gray-200 bg-white font-semibold text-sm disabled:opacity-40"
        >
          Clear
        </button>
      </div>
    </div>
  );
});
