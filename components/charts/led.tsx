"use client";
import { useEffect, useId, useRef, useState } from "react";

/** Dot-matrix mask + soft halo used by every chart, so the whole dashboard reads like one LED board. */
export function LedDefs({ id, dp = 2.618, w, h, color, path }: { id: string; dp?: number; w: number; h: number; color: string; path?: string }) {
  return (
    <defs>
      <pattern id={`${id}led`} width={dp} height={dp} patternUnits="userSpaceOnUse"><circle cx={dp / 2} cy={dp / 2} r={dp / 3.2} fill="#fff" /></pattern>
      <mask id={`${id}ledm`}><rect width={w} height={h} fill={`url(#${id}led)`} /></mask>
      <linearGradient id={`${id}fade`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.3} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient>
      <filter id={`${id}blur`} x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="12" /></filter>
      {path && <mask id={`${id}halo`} maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={h}><path d={path} fill="none" stroke="#fff" strokeWidth="20" strokeLinecap="round" filter={`url(#${id}blur)`} /></mask>}
    </defs>
  );
}

const MONO = "var(--font-geist-mono), ui-monospace";
export type Pt = { t: number; v: number };
export type Series = { key: string; color: string; points: Pt[] };

/** ticks every 200ms so the right edge tracks the wall clock. */
function useNow(ms = 200) {
  const [now, setNow] = useState(() => Date.now());
  const raf = useRef(0);
  useEffect(() => {
    let last = 0;
    const loop = (ts: number) => { if (ts - last > ms) { setNow(Date.now()); last = ts; } raf.current = requestAnimationFrame(loop); };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [ms]);
  return now;
}

/** measure the box so the SVG can render 1:1 in CSS pixels — a stretched viewBox squashes the dots and text. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    setW(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/**
 * LED tape: step lines masked by the dot pattern, blurred halo, head ping, value pill at the live edge and a
 * clock axis whose right edge is always "now" — so it slides even while the data is flat.
 * ponytail: hand-rolled SVG; a chart lib can't do the dot mask + moving now-edge cheaply.
 */
export function LiveTape({ series, windowMs = 3_600_000, fmt = (v: number) => v.toFixed(3), height = 170, dp = 2.618 }: {
  series: Series[]; windowMs?: number; fmt?: (v: number) => string; height?: number; dp?: number;
}) {
  const id = useId().replace(/:/g, "");
  const now = useNow();
  const [box, boxW] = useWidth<HTMLDivElement>();
  const PADR = 72, H = height;
  const W = Math.max(120, boxW - PADR);
  const t0 = now - windowMs;
  const prep = series.map((s) => {
    const sorted = [...s.points].sort((a, b) => a.t - b.t);
    const before = sorted.filter((p) => p.t <= t0).at(-1);
    const inWin = sorted.filter((p) => p.t > t0);
    const pts: Pt[] = [{ t: t0, v: before?.v ?? inWin[0]?.v ?? 0 }, ...inWin];
    return { ...s, pts, head: pts.at(-1)!.v };
  });
  const vals = prep.flatMap((s) => s.pts.map((p) => p.v));
  const lo = Math.min(...vals, 0), hi = Math.max(...vals, 0.001);
  const pad = (hi - lo) * 0.35 || Math.max(hi * 0.15, 0.001);
  const yLo = Math.max(0, lo - pad), yHi = hi + pad;
  const x = (t: number) => ((t - t0) / windowMs) * W;
  const y = (v: number) => H - 24 - ((v - yLo) / (yHi - yLo || 1)) * (H - 48);
  const pathOf = (pts: Pt[], head: number) => {
    let d = `M${x(pts[0].t).toFixed(1)},${y(pts[0].v).toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) d += `L${x(pts[i].t).toFixed(1)},${y(pts[i - 1].v).toFixed(1)}L${x(pts[i].t).toFixed(1)},${y(pts[i].v).toFixed(1)}`;
    return d + `L${W},${y(head).toFixed(1)}`;
  };
  const paths = prep.map((s) => ({ ...s, d: pathOf(s.pts, s.head) }));
  const main = paths[0];
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => yLo + f * (yHi - yLo));
  const times = [0, 0.25, 0.5, 0.75, 1].map((f) => t0 + f * windowMs);
  const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  return (
    <div ref={box} className="w-full overflow-hidden" style={{ height, contain: "inline-size" }}>
      {boxW > 0 && (
      <svg style={{ maxWidth: "100%" }} width={W + PADR} height={H} viewBox={`0 0 ${W + PADR} ${H}`} role="img" aria-label="live tape">
      <LedDefs id={id} dp={dp} w={W} h={H} color={main?.color ?? "#dd2023"} path={main?.d} />
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1="0" x2={W} y1={y(v)} y2={y(v)} stroke="rgba(0,0,0,.08)" strokeWidth="0.5" />
          <text x={W + 8} y={y(v) + 3} fill="#71717a" fontSize="9" fontFamily={MONO}>{fmt(v)}</text>
        </g>
      ))}
      <g mask={`url(#${id}ledm)`}>
        {main && <rect width={W} height={H} fill={main.color} opacity="0.18" mask={`url(#${id}halo)`} />}
        {main && <path d={`${main.d}L${W},${H - 12}L0,${H - 12}Z`} fill={`url(#${id}fade)`} />}
        {paths.map((s) => <path key={s.key} d={s.d} fill="none" stroke={s.color} strokeWidth={dp} strokeLinecap="round" strokeLinejoin="round" />)}
      </g>
      {main && <>
        <line x1="0" x2={W} y1={y(main.head)} y2={y(main.head)} stroke="#a1a1aa" strokeWidth="1" strokeDasharray="4 4" />
        <rect x={W + 2} y={y(main.head) - 9} width={68} height={18} rx="4" fill="#18181b" />
        <text x={W + 36} y={y(main.head) + 4} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600" fontFamily={MONO}>{fmt(main.head)}</text>
      </>}
      {paths.map((s) => <g key={`h${s.key}`}><circle cx={W} cy={y(s.head)} r="2" fill={s.color} /><circle className="head-ping" cx={W} cy={y(s.head)} r="7" fill={s.color} /></g>)}
      {times.map((t, i) => <text key={i} x={Math.min(Math.max(x(t), 26), W - 20)} y={H - 2} textAnchor="middle" fill="#71717a" fontSize="9" fontFamily={MONO}>{clock(t)}</text>)}
      </svg>
      )}
    </div>
  );
}

/** LED bars: same dot matrix, horizontal rows, value at the end of each bar. */
export function LedBars({ rows, color = "#dd2023", fmt = (v: number) => `${v.toFixed(1)}%`, rowH = 26 }: {
  rows: { label: string; v: number; sub?: string }[]; color?: string; fmt?: (v: number) => string; rowH?: number;
}) {
  const id = useId().replace(/:/g, "");
  const [box, boxW] = useWidth<HTMLDivElement>();
  const W = Math.max(240, boxW);
  const LBL = Math.min(140, Math.max(96, Math.round(W * 0.28)));
  const H = Math.max(rowH * rows.length + 8, 60), max = Math.max(...rows.map((r) => r.v), 0.001);
  const bw = (v: number) => Math.max(4, (v / max) * (W - LBL - 60));
  return (
    <div ref={box} className="w-full overflow-hidden" style={{ height: H, contain: "inline-size" }}>
      {boxW > 0 && (
      <svg style={{ maxWidth: "100%" }} width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="odds by card">
      <LedDefs id={id} w={W} h={H} color={color} />
      {rows.map((r, i) => {
        const cy = i * rowH + rowH / 2 + 4;
        return (
          <g key={r.label + i}>
            <text x={LBL - 8} y={cy + 3} textAnchor="end" fill="#3f3f46" fontSize="10" fontFamily={MONO}>{r.label.length > Math.floor(LBL / 6) ? r.label.slice(0, Math.floor(LBL / 6) - 1) + "…" : r.label}</text>
            <line x1={LBL} x2={W - 52} y1={cy} y2={cy} stroke="rgba(0,0,0,.06)" strokeWidth="0.5" />
            <g mask={`url(#${id}ledm)`}><rect x={LBL} y={cy - 5} width={bw(r.v)} height={10} rx={5} fill={color} /></g>
            <text x={LBL + bw(r.v) + 8} y={cy + 3} fill="#18181b" fontSize="10" fontWeight="600" fontFamily={MONO}>{fmt(r.v)}</text>
          </g>
        );
      })}
      </svg>
      )}
    </div>
  );
}

/** LED ring: donut arcs drawn through the same dot matrix, with a glowing centre readout. */
export function LedRing({ slices, size = 150, thickness = 22, center, sub }: {
  slices: { key: string; label: string; v: number; color: string }[]; size?: number; thickness?: number; center?: string; sub?: string;
}) {
  const id = useId().replace(/:/g, "");
  const total = slices.reduce((a, s) => a + s.v, 0) || 1;
  const R = size / 2 - thickness / 2 - 2, C = size / 2;
  const arc = (from: number, to: number) => {
    const a0 = from * 2 * Math.PI - Math.PI / 2, a1 = to * 2 * Math.PI - Math.PI / 2;
    const large = to - from > 0.5 ? 1 : 0;
    return `M${(C + R * Math.cos(a0)).toFixed(2)},${(C + R * Math.sin(a0)).toFixed(2)}A${R},${R} 0 ${large} 1 ${(C + R * Math.cos(a1)).toFixed(2)},${(C + R * Math.sin(a1)).toFixed(2)}`;
  };
  const segs = slices.reduce<((typeof slices)[number] & { from: number; to: number })[]>((out, s) => {
    const from = (out.at(-1)?.to ?? 0);
    return [...out, { ...s, from, to: from + s.v / total }];
  }, []);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="shrink-0" role="img" aria-label="value by pack">
      <LedDefs id={id} w={size} h={size} color={slices[0]?.color ?? "#dd2023"} />
      <circle cx={C} cy={C} r={R} fill="none" stroke="rgba(0,0,0,.06)" strokeWidth={thickness} />
      <g mask={`url(#${id}ledm)`}>
        {segs.map((s) => <path key={s.key} d={arc(s.from + 0.006, Math.max(s.to - 0.006, s.from + 0.007))} fill="none" stroke={s.color} strokeWidth={thickness} strokeLinecap="round" />)}
      </g>
      {center && <text x={C} y={C + 2} textAnchor="middle" fill="#18181b" fontSize="18" fontWeight="700" fontFamily={MONO}>{center}</text>}
      {sub && <text x={C} y={C + 16} textAnchor="middle" fill="#71717a" fontSize="8" fontFamily={MONO}>{sub}</text>}
    </svg>
  );
}

/** LED meter: 0..1 progress through the same dot matrix. Used outside charts (onboarding, rates). */
export function LedMeter({ value, color = "#dd2023", height = 10, label }: { value: number; color?: string; height?: number; label?: string }) {
  const id = useId().replace(/:/g, "");
  const [box, boxW] = useWidth<HTMLDivElement>();
  const W = Math.max(60, boxW), H = height;
  const w = Math.max(2, Math.min(1, Math.max(0, value)) * W);
  return (
    <div ref={box} className="w-full overflow-hidden" style={{ height: H, contain: "inline-size" }} title={label}>
      {boxW > 0 && (
        <svg style={{ maxWidth: "100%" }} width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label ?? "meter"}>
          <LedDefs id={id} w={W} h={H} color={color} />
          <rect x="0" y={H / 2 - H / 2} width={W} height={H} rx={H / 2} fill="rgba(0,0,0,.06)" />
          <g mask={`url(#${id}ledm)`}><rect x="0" y="0" width={w} height={H} rx={H / 2} fill={color} /></g>
        </svg>
      )}
    </div>
  );
}
