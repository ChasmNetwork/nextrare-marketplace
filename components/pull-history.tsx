"use client";
import { useJson } from "@/components/ui";
import { BADGE } from "@/components/ui";
import { sol, tx } from "@/lib/client";
import { tierFor } from "@/components/reveal/pack-reveal";
import { RING, TIER } from "@/components/recent-drops";

type Row = { id: string; t: number; packId: string; status: string; price: number; name: string | null; imageUri: string | null; ask: number | null; paymentSig: string | null; settleSig: string | null; deadline: number | null };
const LABEL: Record<string, string> = { kept: "kept", sold_back: "cashed out", revealed: "deciding" };
const when = (t: number) => new Date(t).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** Every pack this wallet ripped, with the card, the outcome and links that prove the roll was fair. */
export function PullHistory({ me }: { me: string | null }) {
  const { data } = useJson<Row[]>(me ? `/api/me/pulls?buyer=${me}` : null, [], 12000);
  if (!me) return null;
  return (
    <section className="glass led-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Packs I ripped</h2>
        <span className="font-mono text-[11px] text-zinc-600">{data?.length ?? 0} rips</span>
      </div>
      {data && !data.length && <p className="mt-2 text-sm text-zinc-700">No rips yet. Open a pack and your hits show up here with their proof links.</p>}
      <div className="rise mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
        {data?.map((r) => {
          const t = tierFor(r.ask ?? 0);
          return (
            <div key={r.id} className="glass glass-interactive led-surface flex flex-col gap-1.5 p-2.5">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-white/40" style={{ boxShadow: `inset 0 0 0 2px ${RING[t]}55` }}>
                {r.imageUri ? <img src={r.imageUri} alt={r.name ?? ""} className="h-full w-full object-contain" /> : null}
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-sm font-medium" title={r.name ?? ""}>{(r.name ?? "—").replace(/ · PSA.*$/, "")}</span>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${BADGE[r.status === "sold_back" ? "sold" : r.status === "kept" ? "pulled" : "reserved"]}`}>{LABEL[r.status] ?? r.status}</span>
              </div>
              <div className="font-mono text-[10px] font-semibold uppercase" style={{ color: RING[t] }}>{TIER[t]} · {r.packId}</div>
              <div className="font-mono text-[11px] text-zinc-700">paid {sol(r.price)}{r.ask ? ` · worth ${sol(r.ask)}` : ""}</div>
              <div className="font-mono text-[10px] text-zinc-600">{when(r.t)}</div>
              <div className="mt-auto flex flex-wrap gap-1.5 text-[10px]">
                <a className="underline text-zinc-700" href={`/pulls/${r.id}`} target="_blank" rel="noreferrer">proof ↗</a>
                {r.paymentSig && <a className="underline text-zinc-700" href={tx(r.paymentSig)} target="_blank" rel="noreferrer">paid ↗</a>}
                {r.settleSig && <a className="underline text-zinc-700" href={tx(r.settleSig)} target="_blank" rel="noreferrer">settle ↗</a>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
