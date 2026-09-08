"use client";
import { useJson } from "@/components/ui";
import { short, sol, tx } from "@/lib/client";
import { tierFor } from "@/components/reveal/pack-reveal";
import type { Ev } from "@/app/api/activity/route";

export const RING = ["", "#a1a1aa", "#1baf7a", "#2a78d6", "#8b5cf6", "#f5b50a"];
export const TIER = ["", "common", "uncommon", "rare", "epic", "chase"];

/** CS:GO-style "recent drops" rail: last settled pulls, rarity ring + glow, newest slides in. Each tile links to its settle tx. */
export function RecentDrops({ me }: { me?: string | null }) {
  const { data } = useJson<Ev[]>("/api/activity", [], 6000);
  const drops = (data ?? []).filter((e) => (e.kind === "kept" || e.kind === "sold_back") && e.imageUri).slice(0, 8);
  if (!drops.length) return null;
  const best = drops.reduce((a, b) => ((b.ask ?? 0) > (a.ask ?? 0) ? b : a));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-bold uppercase tracking-wider text-neutral-700">Recent hits</span>
        <span className="text-neutral-700">top: <span className="font-medium" style={{ color: RING[tierFor(best.ask ?? 0)] }}>{best.name?.replace(/ · PSA.*$/, "")}</span> · {sol(best.ask ?? 0)}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 rail">
        {drops.map((e, i) => { const t = tierFor(e.ask ?? 0); const mine = !!me && e.who === me; return (
          <a key={`${e.sig ?? e.t}${i}`} href={e.sig ? tx(e.sig) : undefined} target="_blank" className="drop-in w-16 shrink-0 text-center" style={{ animationDelay: `${i * 50}ms` }} title={`${e.name} · ${e.kind === "kept" ? "kept" : "cashed out"} by ${mine ? "you" : short(e.who)}`}>
            <div className="aspect-[3/4] overflow-hidden rounded-lg bg-white/70" style={{ boxShadow: `0 0 0 2px ${mine ? "#dd2023" : RING[t]}, 0 0 ${t * 6}px ${RING[t]}${t >= 4 ? "cc" : "66"}` }}><img src={e.imageUri} alt="" className="h-full w-full object-contain" /></div>
            <div className="mt-1 truncate font-mono text-[10px] font-semibold uppercase" style={{ color: RING[t] }}>{TIER[t]}</div>
            <div className="font-mono text-[10px] text-zinc-600">{e.kind === "kept" ? "kept" : "cashed out"}</div>
          </a>); })}
      </div>
    </div>
  );
}
