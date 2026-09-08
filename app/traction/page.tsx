"use client";
import Link from "next/link";
import { useState } from "react";
import { useJson } from "@/components/ui";
import { Live } from "@/components/live";
import { Stat } from "@/components/stat";
import { LedBars, LedMeter, LiveTape } from "@/components/charts/led";
import { addr, short } from "@/lib/client";

type T = {
  goal: number; users: number; active: number; team: number; sim: { wallets: number; rips: number; listed: number };
  funnel: { label: string; n: number }[];
  byRef: { ref: string; n: number }[];
  points: { t: number; v: number }[];
  feedback: { count: number; avg: number; dist: { label: string; n: number }[]; rows: { id: string; wallet: string | null; score: number; role: string | null; note: string | null; ref: string | null; createdAt: number }[] };
  list: { wallet: string; ref: string | null; firstSeen: number; visits: number; listed: number; ripped: number; bought: number; rentLamports: number; feedback: number; team: boolean; sim: boolean }[];
};

const BASE = "https://nextrare-marketplace.vercel.app";
const REFS = ["event", "tg", "x", "judge", "friend"];
const when = (t: number) => new Date(t).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function Traction() {
  const { data: d, at } = useJson<T>("/api/traction", [], 10000);
  const { data: wl } = useJson<{ count: number; rows: { id: string; contact: string; role: string | null; note: string | null; ref: string | null; createdAt: number }[] }>("/api/waitlist", [], 15000);
  const [copied, setCopied] = useState<string | null>(null);
  const pct = d ? Math.min(1, d.users / d.goal) : 0;
  const copy = (ref: string) => { navigator.clipboard.writeText(`${BASE}/?ref=${ref}`); setCopied(ref); setTimeout(() => setCopied(null), 1500); };

  return (
    <div className="rise space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold sm:text-3xl">Traction</h1><Live at={at} className="glass glass-pill px-2.5 py-1" /></div>
            <p className="mt-1 text-base font-medium text-zinc-800">Real wallets that used the live devnet app, and what they said. Our own wallets and the load-test wallets are shown separately and never counted.</p>
          </div>
          <Link href="/" className="glass glass-pill glass-interactive px-3 py-1.5 text-xs font-medium text-zinc-800">← Back to app</Link>
        </div>

        <div className="grid min-w-0 items-start gap-3 [&>*]:min-w-0 lg:grid-cols-2 2xl:grid-cols-4">
          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:col-span-2 lg:grid-cols-5 2xl:col-span-4">
            <Stat label="Users acquired" sol={d?.users ?? 0} plain hint={`goal ${d?.goal ?? 10} · ${d?.team ?? 0} team wallets excluded`} accent="#dd2023" meter={pct} />
            <Stat label="Did a transaction" sol={d?.active ?? 0} plain hint="listed, bought or ripped" />
            <Stat label="Feedback replies" sol={d?.feedback.count ?? 0} plain hint={`${d?.feedback.avg ?? 0} / 5 would use it`} />
            <Stat label="Waitlist signups" sol={wl?.count ?? 0} plain hint="no wallet needed · /about" />
            <Stat label="Simulated wallets" sol={d?.sim.wallets ?? 0} plain hint={`load test · ${d?.sim.rips ?? 0} rips · ${d?.sim.listed ?? 0} listed · not counted`} />
          </div>

          <div className="glass led-surface p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-700">Users over time</p>
            <LiveTape series={[{ key: "u", color: "#dd2023", points: d?.points ?? [] }]} windowMs={86_400_000} fmt={(v) => v.toFixed(0)} height={150} />
          </div>

          <div className="glass led-surface p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-700">What they actually did</p>
            <div className="mt-2"><LedBars rows={(d?.funnel ?? []).map((f) => ({ label: f.label, v: f.n }))} fmt={(v) => (d?.users ? `${v} · ${Math.round((v / d.users) * 100)}%` : `${v}`)} /></div>
          </div>

          <div className="glass led-surface p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-700">Would use it for real cards</p>
            <div className="mt-2"><LedBars rows={(d?.feedback.dist ?? []).map((x) => ({ label: x.label, v: x.n }))} fmt={(v) => `${v}`} /></div>
            <div className="mt-3 border-t border-black/5 pt-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">Where users came from</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(d?.byRef ?? []).map((r) => <span key={r.ref} className="glass glass-pill px-2.5 py-1 text-xs font-semibold text-zinc-800">{r.ref} · {r.n}</span>)}
                {!d?.byRef.length && <span className="text-xs text-zinc-600">no users yet</span>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-bold">Share links</h2>
          <p className="text-sm text-zinc-700">Each link tags where the user came from, so the number above is attributable.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {REFS.map((r) => (
            <button key={r} onClick={() => copy(r)} className="glass glass-interactive flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold text-zinc-900">
              <span className="min-w-0 truncate">/?ref={r}</span><span aria-hidden className="shrink-0 text-zinc-500">{copied === r ? "copied" : "copy"}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Feedback wall</h2>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {d?.feedback.rows.map((f) => (
            <div key={f.id} className="glass p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-[var(--nr)]">{"★".repeat(f.score)}<span className="text-zinc-300">{"★".repeat(5 - f.score)}</span></span>
                <span className="shrink-0 text-[11px] text-zinc-500">{when(f.createdAt)}</span>
              </div>
              {f.note && <p className="mt-1.5 break-words text-sm text-zinc-800">{f.note}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-600">
                {f.role && <span className="rounded-full bg-black/5 px-2 py-0.5 capitalize">{f.role}</span>}
                {f.ref && <span className="rounded-full bg-black/5 px-2 py-0.5">via {f.ref}</span>}
                {f.wallet && <a href={addr(f.wallet)} target="_blank" className="underline">{short(f.wallet)} ↗</a>}
              </div>
            </div>
          ))}
          {!d?.feedback.rows.length && <p className="text-sm text-zinc-600">No feedback yet. Share a link above.</p>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Waitlist</h2>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {wl?.rows.map((r) => (
            <div key={r.id} className="glass p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-bold">{r.contact}</span>
                <span className="shrink-0 text-[11px] text-zinc-500">{when(r.createdAt)}</span>
              </div>
              {r.note && <p className="mt-1.5 break-words text-sm text-zinc-800">{r.note}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-zinc-600">
                {r.role && <span className="rounded-full bg-black/5 px-2 py-0.5 capitalize">{r.role}</span>}
                {r.ref && <span className="rounded-full bg-black/5 px-2 py-0.5">via {r.ref}</span>}
              </div>
            </div>
          ))}
          {!wl?.rows.length && <p className="text-sm text-zinc-600">Nobody yet. Share /about?ref=tg.</p>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Every wallet that showed up</h2>
        <div className="glass overflow-x-auto p-1 rail">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-zinc-600">
              <tr>{["Wallet", "First seen", "Visits", "Listed", "Ripped", "Bought", "Rent", "Feedback"].map((h) => <th key={h} className="whitespace-nowrap px-2.5 py-2 font-bold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {d?.list.map((u) => (
                <tr key={u.wallet} className={`border-t border-black/5 ${u.team || u.sim ? "opacity-50" : ""}`}>
                  <td className="whitespace-nowrap px-2.5 py-2 font-medium"><a href={addr(u.wallet)} target="_blank" className="underline">{short(u.wallet)}</a>{u.team && <span className="ml-1.5 rounded-full bg-black/5 px-1.5 py-0.5 text-[10px]">team</span>}{u.sim && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">simulated</span>}</td>
                  <td className="whitespace-nowrap px-2.5 py-2 text-zinc-700">{when(u.firstSeen)}</td>
                  <td className="px-2.5 py-2">{u.visits}</td>
                  <td className="px-2.5 py-2">{u.listed}</td>
                  <td className="px-2.5 py-2">{u.ripped}</td>
                  <td className="px-2.5 py-2">{u.bought}</td>
                  <td className="whitespace-nowrap px-2.5 py-2">{(u.rentLamports / 1e9).toFixed(4)}</td>
                  <td className="px-2.5 py-2">{u.feedback ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
