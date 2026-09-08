"use client";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";
import { Btn, Err, useJson, useSolPrice } from "@/components/ui";
import { LedBars, LedMeter } from "@/components/charts/led";
import { getRef } from "@/components/track";

type Stats = { listings: number; listers: number; value: number; pulls: number; kept: number; soldBack: number; volume: number; pool: number };
const ROLES = ["collector", "seller", "shop / grader", "investor"] as const;

const STEPS = [
  { n: "01", t: "List once, at your price", b: "Your graded slab stays in your wallet. We lock it with a Metaplex Core freeze plugin, so nobody — us included — can move it without your listing." },
  { n: "02", t: "It sells two ways at once", b: "Anyone can buy it outright at your price. The same card also sits inside a gacha pack, so pack rippers are a second stream of buyers." },
  { n: "03", t: "A rip ends one of two ways", b: "Keep: you get paid your full price, the card ships to them. Cash out: they take 85% instantly, your card never moves and stays listed." },
  { n: "04", t: "Cash-outs pay you rent", b: "The 15% spread is the business. Half goes back to every lister in that pack, pro-rata by card value. Your idle listing earns while it waits." },
];

export default function About() {
  const { data: s } = useJson<Stats>("/api/stats", [], 15000);
  const { data: w, reload } = useJson<{ count: number }>("/api/waitlist", [], 20000);
  const p = useSolPrice();
  const [contact, setContact] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const usd = (l: number) => (p ? "$" + ((l / 1e9) * p).toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—");

  const join = async () => {
    setBusy(true); setErr(null);
    try { await api("/api/waitlist", { contact, role, note, ref: getRef() }); setDone(true); reload(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="rise mx-auto max-w-5xl space-y-6">
      <section className="glass led-surface p-5 sm:p-7">
        <span className="glass glass-pill inline-block px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-700">Live on Solana devnet</span>
        <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">A card marketplace where <span className="text-[var(--nr)]">listings earn while they wait.</span></h1>
        <p className="mt-3 max-w-2xl text-base font-medium text-zinc-800 sm:text-lg">
          Fair-priced graded cards sit unsold for weeks. The only fast exit is selling under market. We give every listing a second buyer — gacha pack rippers — and pay the lister rent when a ripper takes cash instead of the card.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/" className="glass glass-prominent glass-interactive inline-flex h-10 items-center rounded-full px-5 text-sm font-bold text-zinc-900">Try the live demo →</Link>
          <a href="#waitlist" className="glass glass-interactive inline-flex h-10 items-center rounded-full px-5 text-sm font-bold text-zinc-800">Join the waitlist</a>
          <Link href="/traction" className="glass glass-interactive inline-flex h-10 items-center rounded-full px-5 text-sm font-medium text-zinc-800">See who is using it</Link>
        </div>
      </section>

      <section className="grid gap-2 sm:grid-cols-2">
        {STEPS.map((x) => (
          <div key={x.n} className="glass glass-interactive p-4">
            <span className="font-mono text-xs font-bold text-[var(--nr)]">{x.n}</span>
            <h2 className="mt-1 text-lg font-bold leading-tight">{x.t}</h2>
            <p className="mt-1.5 text-sm text-zinc-800">{x.b}</p>
          </div>
        ))}
      </section>

      <section className="glass led-surface p-4">
        <h2 className="text-xl font-bold">The money, in one line each</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-zinc-800">
          <li><b>2% buy fee.</b> Paid by anyone who buys a card outright on the marketplace.</li>
          <li><b>Cash-out spread.</b> A ripper who cashes out gets 85% of the card&rsquo;s listed value; the 15% left over is gross profit, split 50/50 with the listers in that pack.</li>
          <li><b>Keeps cost us nothing.</b> If they keep the card, the lister is paid in full and we take no spread — the pack price was the card&rsquo;s fair value.</li>
        </ul>
        <p className="mt-3 rounded-xl bg-black/5 p-3 font-mono text-xs leading-relaxed text-zinc-800">
          π = P − D − V + b·(V − B)<br />
          P = pack price paid · V = insured value of revealed card · B = buyback paid out · D = dispute/refund cost<br />
          b = 1 if the ripper cashes out, 0 if they keep the card
        </p>
      </section>

      <section className="glass p-4">
        <h2 className="text-xl font-bold">Running right now on devnet</h2>
        <p className="text-sm text-zinc-700">Not a mockup. Every number below is read from the chain and the live app.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { k: "Cards listed", v: `${s?.listings ?? 0}`, s: `${s?.listers ?? 0} sellers · ${usd(s?.value ?? 0)}` },
            { k: "Packs ripped", v: `${s?.pulls ?? 0}`, s: `${usd(s?.volume ?? 0)} through packs` },
            { k: "Rent paid to sellers", v: `${((s?.pool ?? 0) / 1e9).toFixed(3)} SOL`, s: "withdrawable any time" },
            { k: "Cash-out rate", v: s?.pulls ? `${Math.round((s.soldBack / s.pulls) * 100)}%` : "0%", s: `${s?.kept ?? 0} kept · ${s?.soldBack ?? 0} cashed out` },
          ].map((x) => (
            <div key={x.k} className="rounded-2xl bg-white/60 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">{x.k}</p>
              <p className="mt-0.5 text-xl font-bold">{x.v}</p>
              <p className="text-[11px] text-zinc-600">{x.s}</p>
            </div>
          ))}
        </div>
        <div className="mt-3"><LedBars rows={[{ label: "Cashed out", v: s?.soldBack ?? 0 }, { label: "Kept the card", v: s?.kept ?? 0 }]} fmt={(v) => `${v}`} /></div>
      </section>

      <section id="waitlist" className="glass led-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Join the waitlist</h2>
            <p className="text-sm text-zinc-700">Mainnet with real graded slabs is next. Leave an email or @handle and we ping you first.</p>
          </div>
          <div className="w-44"><LedMeter value={Math.min(1, (w?.count ?? 0) / 50)} height={8} label={`${w?.count ?? 0} on the list`} /></div>
        </div>
        {done ? (
          <p className="mt-4 text-sm font-semibold text-emerald-700">You are on the list. We will message you before mainnet opens.</p>
        ) : (
          <>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="you@email.com or @telegram"
                className="h-10 w-full min-w-0 rounded-full sm:flex-1 border border-black/10 bg-white/70 px-4 text-sm outline-none focus:border-[var(--nr)]/50" />
              <Btn busy={busy} disabled={contact.trim().length < 4} onClick={join} className="h-10 w-full shrink-0 px-5 sm:w-auto">Join waitlist</Btn>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ROLES.map((r) => (
                <button key={r} onClick={() => setRole(r)}
                  className={`glass-interactive h-8 rounded-full px-3 text-xs font-semibold capitalize transition ${role === r ? "bg-zinc-900 text-white" : "bg-white/60 text-zinc-700"}`}>{r}</button>
              ))}
            </div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={600}
              placeholder="What would you list first? (optional)"
              className="mt-2 w-full resize-none rounded-xl border border-black/10 bg-white/70 p-2.5 text-sm outline-none focus:border-[var(--nr)]/50" />
            <div className="mt-2"><Err msg={err} /></div>
          </>
        )}
      </section>

      <section className="glass p-4">
        <h2 className="text-xl font-bold">Why this needs a chain</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-zinc-800">
          <li><b>Non-custodial.</b> Listed cards never leave the owner&rsquo;s wallet — a freeze plugin holds them, not our vault.</li>
          <li><b>Atomic.</b> Payment and card transfer settle in one transaction, so nobody can be paid without delivering.</li>
          <li><b>Provable odds.</b> Every rip commits a hashed secret in the payment transaction, then reveals it — anyone can recompute the roll.</li>
          <li><b>Auditable payouts.</b> Rent and cash-outs are transfers you can open in an explorer.</li>
        </ul>
        <Link href="/" className="glass glass-prominent glass-interactive mt-3 inline-flex h-10 items-center rounded-full px-5 text-sm font-bold text-zinc-900">Rip a pack on devnet →</Link>
      </section>
    </div>
  );
}
