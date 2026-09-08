"use client";
import { useState } from "react";
import { MonoCard, Seg } from "./charts/mono";
import { LiveTape } from "./charts/led";

// categorical, fixed order (dataviz palette slots 1-3, validated on #f3f5f8)
export const PACK_COLOR: Record<string, string> = { budget: "#2a78d6", mid: "#eb6834", chase: "#1baf7a" };
type Ev = { t: number; packId: string; amount: number };
const WIN = { "1h": 3_600_000, "24h": 86_400_000, "7d": 604_800_000 } as const;

/** Your rent per pack as LED tapes on one clock axis. */
export function YieldChart({ events, live }: { events: Ev[]; solUsd?: number | null; live?: number | null }) {
  const [span, setSpan] = useState<keyof typeof WIN>("24h");
  const packs = Object.keys(PACK_COLOR).filter((p) => events.some((e) => e.packId === p));
  const series = packs.map((p) => ({
    key: p, color: PACK_COLOR[p],
    points: events.filter((e) => e.packId === p).reduce<{ t: number; v: number }[]>((acc, e) => [...acc, { t: e.t, v: +(((acc.at(-1)?.v ?? 0) * 1e9 + e.amount) / 1e9).toFixed(6) }], []),
  }));
  const total = series.reduce((a, s) => a + (s.points.at(-1)?.v ?? 0), 0);
  return (
    <MonoCard live={live} label="Your rent, by pack" badge={`${events.length} payments`} value={total.toFixed(4)} unit="SOL earned"
      action={<Seg value={span} options={["1h", "24h", "7d"] as const} onChange={setSpan} />}
      footerL="bigger card, bigger cut" footerR="paid monthly">
      {!series.length ? <p className="py-10 text-center text-sm text-zinc-600">Nothing yet. List a card, then earn on every cash-out in its pack.</p> : (
        <>
          <LiveTape series={series} windowMs={WIN[span]} height={180} fmt={(v) => v.toFixed(4)} />
          <div className="mt-1 flex justify-center gap-4 text-[11px] text-neutral-700">
            {series.map((s) => <span key={s.key} className="flex items-center gap-1.5 whitespace-nowrap"><i className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.key}</span>)}
          </div>
        </>
      )}
    </MonoCard>
  );
}
