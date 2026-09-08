"use client";
import { MonoCard } from "./mono";
import { LedRing } from "./led";
import { PACK_COLOR } from "@/components/yield-chart";
import { PACKS } from "@/lib/packs";

/** LED ring: value on the table per pack, with the chase share in the middle. */
export function PackDonut({ byPack, solUsd, live }: { byPack: Record<string, { cards: number; value: number }>; solUsd: number | null; live?: number | null }) {
  const data = PACKS.map((p) => ({ key: p.slug, label: p.name, color: PACK_COLOR[p.slug], v: +((byPack[p.slug]?.value ?? 0) / 1e9).toFixed(3), cards: byPack[p.slug]?.cards ?? 0 })).filter((d) => d.v > 0);
  const total = data.reduce((a, d) => a + d.v, 0);
  const chase = total ? Math.round(((data.find((d) => d.key === "chase")?.v ?? 0) / total) * 100) : 0;
  return (
    <MonoCard live={live} label="What’s in the packs" badge="live" value={total.toFixed(3)} unit="SOL on the table"
      sub={solUsd ? `≈ $${(total * solUsd).toLocaleString("en-US", { maximumFractionDigits: 0 })}` : undefined}
      footerL={`${data.reduce((a, d) => a + d.cards, 0)} cards`} footerR={`${data.length} packs live`}>
      <div className="flex items-center gap-4">
        <LedRing slices={data} center={`${chase}%`} sub="IN CHASE" />
        <ul className="min-w-0 flex-1 space-y-2 text-sm">
          {data.map((d) => (
            <li key={d.key} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 whitespace-nowrap"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />{d.label}</span>
              <span className="whitespace-nowrap font-mono tabular-nums text-neutral-800">{d.v.toFixed(3)} <span className="text-neutral-500">· {d.cards}</span></span>
            </li>
          ))}
          {!data.length && <li className="text-neutral-600">No cards listed yet.</li>}
        </ul>
      </div>
    </MonoCard>
  );
}
