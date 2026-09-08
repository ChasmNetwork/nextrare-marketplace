"use client";
import { useJson } from "@/components/ui";
import { Live } from "@/components/live";
import { short, sol, tx, addr } from "@/lib/client";
import type { Ev } from "@/app/api/activity/route";

const LABEL: Record<Ev["kind"], string> = { listed: "listed", sold: "bought", pulled: "ripped", kept: "kept", sold_back: "cashed out", payout: "got rent", delisted: "delisted" };
const DOT: Record<Ev["kind"], string> = { listed: "bg-sky-500", sold: "bg-[var(--nr)]", pulled: "bg-violet-500", kept: "bg-[var(--nr)]", sold_back: "bg-amber-500", payout: "bg-emerald-500", delisted: "bg-zinc-400" };
const ago = (t: number) => { const s = Math.round((Date.now() - t) / 1000); return s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s / 60)}m` : s < 86400 ? `${Math.round(s / 3600)}h` : `${Math.round(s / 86400)}d`; };

/** Live protocol feed. Every row links to its onchain tx. */
export function ActivityFeed({ me }: { me?: string | null }) {
  const { data, at } = useJson<Ev[]>("/api/activity", [], 8000);
  return (
    <div className="glass glass-strong led-surface flex h-full flex-col rounded-[20px] p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-neutral-700">Activity</span><Live at={at} /></div>
      <ol className="flex-1 space-y-1 overflow-y-auto pr-1 text-sm" style={{ maxHeight: 250 }}>
        {data?.map((e, i) => (
          <li key={i} className={`fade-in flex items-center gap-2 rounded-lg px-2 py-1.5 ${me && e.who === me ? "bg-[var(--nr)]/8" : ""}`}>
            <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[e.kind]}`} />
            <span className="min-w-0 flex-1 truncate"><a href={addr(e.who)} target="_blank" className="font-medium hover:underline">{me && e.who === me ? "You" : short(e.who)}</a> <span className="text-neutral-700">{LABEL[e.kind]}</span>{e.name && <span> {e.name.replace(/ · PSA.*$/, "")}</span>}{e.lamports ? <span className="font-mono text-neutral-700"> · {sol(e.lamports)}</span> : null}</span>
            <span className="shrink-0 font-mono text-[10px] text-neutral-600">{ago(e.t)}</span>
            {e.sig && <a href={tx(e.sig)} target="_blank" className="shrink-0 text-[10px] font-medium text-neutral-700 underline">tx</a>}
          </li>
        ))}
        {data && !data.length && <li className="text-neutral-600">Nothing yet.</li>}
      </ol>
    </div>
  );
}
