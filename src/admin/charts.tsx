// Small, dependency-free SVG charts for the admin Stats screen.
// One series per chart (no dual axes), thin 2px line, recessive grid, crosshair + tooltip on hover/touch.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

const NAVY = '#0F2F5C';
const GRID = '#E6DECB';
const MUTED = '#5B6676';

export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function niceScale(max: number, whole: boolean) {
  if (!(max > 0)) return { top: whole ? 4 : 1, ticks: whole ? [0, 1, 2, 3, 4] : [0, 0.25, 0.5, 0.75, 1] };
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const r = raw / mag;
  let step = (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag;
  if (whole) step = Math.max(1, Math.ceil(step));
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(+v.toFixed(6));
  return { top, ticks };
}

const shortDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export type Point = { x: string; y: number | null };

/** Daily line chart. `tooltip(i)` renders the hover card for day i. */
export function LineChart({
  points, fmt, whole = true, height = 240, tooltip, label,
}: {
  points: Point[]; fmt: (v: number) => string; whole?: boolean; height?: number; tooltip: (i: number) => ReactNode; label: string;
}) {
  const [box, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const padL = 44, padR = 16, padT = 12, padB = 28;
  const iw = Math.max(10, w - padL - padR), ih = height - padT - padB;
  const max = Math.max(0, ...points.map((p) => p.y ?? 0));
  const { top, ticks } = niceScale(max, whole);
  const xAt = (i: number) => padL + (points.length <= 1 ? iw / 2 : (i * iw) / (points.length - 1));
  const yAt = (v: number) => padT + ih - (v / top) * ih;

  // Split into segments at gaps (null values, e.g. no solves that day).
  const { line, area } = useMemo(() => {
    const segs: { i: number; y: number }[][] = [];
    let cur: { i: number; y: number }[] = [];
    points.forEach((p, i) => {
      if (p.y == null) { if (cur.length) segs.push(cur); cur = []; } else cur.push({ i, y: p.y });
    });
    if (cur.length) segs.push(cur);
    const line = segs.map((s) => s.map((p, k) => `${k ? 'L' : 'M'}${xAt(p.i).toFixed(1)},${yAt(p.y).toFixed(1)}`).join('')).join('');
    const area = segs
      .filter((s) => s.length > 1)
      .map((s) => `M${xAt(s[0].i)},${yAt(0)}` + s.map((p) => `L${xAt(p.i).toFixed(1)},${yAt(p.y).toFixed(1)}`).join('') + `L${xAt(s[s.length - 1].i)},${yAt(0)}Z`)
      .join('');
    return { line, area };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, w, top, height]);

  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(iw / 70))));
  const pick = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    const x = clientX - r.left - padL;
    const i = points.length <= 1 ? 0 : Math.round((x / iw) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };
  const hp = hover != null ? points[hover] : null;
  const tipLeft = hover != null ? xAt(hover) : 0;

  return (
    <div ref={box} className="relative select-none" style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={label}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={w - padR} y1={yAt(t)} y2={yAt(t)} stroke={GRID} strokeWidth={1} />
              <text x={padL - 8} y={yAt(t) + 4} textAnchor="end" fontSize={12} fill={MUTED}>{fmt(t)}</text>
            </g>
          ))}
          {points.map((p, i) => {
            const last = points.length - 1;
            const show = i % labelEvery === 0 ? last - i >= labelEvery * 0.6 || i === last : i === last;
            return show ? (
              <text key={p.x} x={xAt(i)} y={height - 8} textAnchor={points.length > 1 && i === last ? 'end' : i === 0 && points.length > 1 ? 'start' : 'middle'} fontSize={12} fill={MUTED}>{shortDay(p.x)}</text>
            ) : null;
          })}
          <path d={area} fill={NAVY} opacity={0.08} />
          <path d={line} fill="none" stroke={NAVY} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {points.length <= 1 && points[0]?.y != null && <circle cx={xAt(0)} cy={yAt(points[0].y)} r={5} fill={NAVY} />}
          {hp && (
            <g pointerEvents="none">
              <line x1={tipLeft} x2={tipLeft} y1={padT} y2={padT + ih} stroke={NAVY} strokeOpacity={0.35} strokeWidth={1} />
              {hp.y != null && <circle cx={tipLeft} cy={yAt(hp.y)} r={5} fill={NAVY} stroke="#FFFAF0" strokeWidth={2} />}
            </g>
          )}
          <rect
            x={padL - 6} y={0} width={iw + 12} height={height} fill="transparent"
            onMouseMove={(e) => pick(e.clientX)} onMouseLeave={() => setHover(null)}
            onTouchStart={(e) => pick(e.touches[0].clientX)} onTouchMove={(e) => pick(e.touches[0].clientX)}
          />
        </svg>
      )}
      {hover != null && (
        <div
          className="pointer-events-none absolute top-1 z-10 w-56 rounded-xl border-2 border-ink bg-white p-3 text-sm shadow-[0_3px_0_0_#10233F]"
          style={tipLeft > w / 2 ? { right: w - tipLeft + 12 } : { left: tipLeft + 12 }}
        >
          {tooltip(hover)}
        </div>
      )}
    </div>
  );
}

/** Tiny trend line for KPI tiles. */
export function Sparkline({ values }: { values: (number | null)[] }) {
  const w = 120, h = 32;
  const vs = values.filter((v): v is number => v != null);
  const max = Math.max(1, ...vs);
  if (vs.length < 2) return null;
  const d = vs.map((v, i) => `${i ? 'L' : 'M'}${((i * (w - 4)) / (vs.length - 1) + 2).toFixed(1)},${(h - 3 - (v / max) * (h - 6)).toFixed(1)}`).join('');
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" stroke={NAVY} strokeOpacity={0.55} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/** Labelled horizontal bars (one colour; length carries the value). */
export function Bars({ items, fmt }: { items: { label: string; value: number; note?: string }[]; fmt: (v: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.label} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-2 text-sm">
          <span className="text-ink/75">{it.label}</span>
          <span className="h-3 rounded-full bg-[#EFE8D8] overflow-hidden">
            <span className="block h-full rounded-full bg-navy" style={{ width: `${(it.value / max) * 100}%`, minWidth: it.value ? 6 : 0 }} />
          </span>
          <span className="font-bold tabular-nums text-right min-w-[3.5rem]">
            {fmt(it.value)}{it.note && <span className="font-normal text-ink/55"> {it.note}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
