"use client";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { api, tx } from "@/lib/client";
import { Btn, Err, useJson } from "@/components/ui";
import { WalletButton } from "@/components/wallet-button";
import { LedMeter } from "@/components/charts/led";

type Me = { unlisted: unknown[]; listings: { status: string }[]; pulls: number };
type Y = { unpaid: number; byPack: Record<string, { unpaid: number; paid: number }> };

/** 5-step judge path. Each step lights up from live state; the faucet step is one click. */
export function Onboarding() {
  const { publicKey } = useWallet();
  const me = publicKey?.toBase58() ?? null;
  const { data, reload } = useJson<Me>(me ? `/api/me?owner=${me}` : null, [], 10000);
  const { data: y } = useJson<Y>(me ? `/api/yield?lister=${me}` : null, [], 10000);
  const { data: bal } = useJson<{ lamports: number }>(me ? `/api/balance?wallet=${me}` : null, [], 15000);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [got, setGot] = useState<{ minted: { name: string }[]; solSig: string | null; sol: number } | null>(null);

  const hasCards = !!data && (data.unlisted.length > 0 || data.listings.length > 0);
  const listed = !!data && data.listings.some((l) => l.status !== "delisted");
  const pulled = (data?.pulls ?? 0) > 0;
  const earned = !!y && Object.values(y.byPack).some((v) => v.unpaid + v.paid > 0);
  const steps = [
    { done: !!me, title: "Connect your wallet", body: "Phantom, Testnet Mode on, network Solana Devnet. No signup.", cta: !me ? <WalletButton /> : null },
    { done: hasCards, title: "Grab 2 free slabs", body: "Two graded cards land in your wallet, plus 0.25 SOL for fees.", cta: me && !hasCards ? <Btn busy={busy} onClick={async () => { setBusy(true); setMsg(null); try { setGot(await api("/api/faucet", { wallet: me })); reload(); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); } }}>Get free cards</Btn> : null },
    { done: listed, title: "List one", body: "One tap. It goes on sale and into a pack at the same time.", href: "#me" },
    { done: pulled, title: "Rip a pack", body: "Watch the reveal, then keep the card or take instant cash.", href: "#theater" },
    { done: earned, title: "Collect rent", body: "Every cash-out in your pack pays you. Monthly.", href: "#me" },
  ];
  const n = steps.filter((s) => s.done).length;
  if (n === steps.length) return null;
  return (
    <div className="glass led-surface p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div><span className="text-xs font-bold uppercase tracking-wider text-neutral-700">Start here · 60 seconds</span><span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-neutral-600">{n}/{steps.length}</span></div>
        <div className="w-40"><LedMeter value={n / steps.length} height={8} label="setup progress" /></div>
      </div>
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {steps.map((s, i) => (
          <li key={s.title} className={`flex flex-col gap-1.5 rounded-2xl border p-2.5 text-sm transition ${s.done ? "border-emerald-200 bg-emerald-50/60" : i === n ? "border-[var(--nr)]/40 bg-white/70 shadow-[0_0_0_3px_rgba(221,32,35,.08)]" : "border-black/5 bg-white/40 opacity-70"}`}>
            <div className="flex items-center gap-2"><span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${s.done ? "bg-emerald-500 text-white" : "bg-black/10 text-neutral-700"}`}>{s.done ? "✓" : i + 1}</span><span className="font-medium leading-tight">{s.title}</span></div>
            <p className="text-xs text-neutral-700">{s.body}</p>
            {!s.done && s.cta}
            {!s.done && !s.cta && s.href && i === n && <a href={s.href} className="text-xs font-medium text-nr underline">Go →</a>}
          </li>
        ))}
      </ol>
      {me && bal && bal.lamports === 0 && <p className="mt-3 text-sm font-medium text-amber-800">This wallet has 0 SOL on devnet. If Phantom shows a balance, it is pointed at mainnet: Settings → Developer Settings → Testnet Mode on, then pick Solana Devnet.</p>}
      {got && <p className="mt-3 text-sm text-emerald-700">Minted {got.minted.map((m) => m.name).join(" + ")}{got.sol ? ` and sent ${got.sol} SOL` : ""}. {got.solSig && <a className="underline" href={tx(got.solSig)} target="_blank">tx</a>} Now <a href="#me" className="underline">list one</a>.</p>}
      <div className="mt-2"><Err msg={msg} /></div>
    </div>
  );
}
