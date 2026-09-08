"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { api, signBuilt, sol, tx, addr } from "@/lib/client";
import { useJson, Btn, Ghost, Err, Price, useSolPrice, usd } from "@/components/ui";
import { DECISION_MS } from "@/lib/pack-math";
import { OddsChart } from "@/components/charts/odds-chart";
import { PackReveal, tierFor } from "@/components/reveal/pack-reveal";
import { RecentDrops, RING, TIER } from "@/components/recent-drops";

type PackData = { pack: { name: string }; price: number; open: boolean; cards: { id: string; asset: string; name: string; imageUri: string; askLamports: number; lister: string; prob: number }[];
  stats: { pulls: number; kept: number; soldBack: number; volume: number; pool: number; totalAsk: number }; activity: { t: number; pool: number; status: string; price: number }[] };
type Pull = { id: string; status: string; paymentSig: string; settleSig?: string; decisionDeadline: number; won: { name: string; imageUri: string; askLamports: number; lister: string } | null };

export function PackTheater({ slug }: { slug: string }) {
  const { publicKey, signTransaction } = useWallet();
  const { data, err, reload, at } = useJson<PackData>(`/api/packs/${slug}`, [], 8000);
  const [pull, setPull] = useState<Pull | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const p = useSolPrice();
  const [revealDone, setRevealDone] = useState(false);

  const refresh = async (id: string) => setPull(await api<Pull>(`/api/pulls/${id}`));

  useEffect(() => {
    if (!pull || pull.status !== "revealed") return;
    const t = setInterval(() => { const l = pull.decisionDeadline - Date.now(); setLeft(l); if (l <= 0) { clearInterval(t); refresh(pull.id); } }, 500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pull?.id, pull?.status]);

  async function doPull() {
    if (!publicKey || !signTransaction) return setMsg("connect wallet");
    setBusy(true); setMsg(null); setPull(null); setRevealDone(false);
    try {
      const built = await api<{ pullId: string; tx: string }>(`/api/packs/${slug}/pull`, { buyer: publicKey.toBase58() });
      const signed = await signBuilt(built.tx, signTransaction);
      await api(`/api/packs/${slug}/pull/submit`, { pullId: built.pullId, signed });
      await refresh(built.pullId); reload();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }
  async function decide(choice: "keep" | "sellback") {
    if (!pull || !publicKey) return;
    setBusy(true); setMsg(null);
    try {
      await api(`/api/pulls/${pull.id}/decide`, { choice, buyer: publicKey.toBase58() }); await refresh(pull.id); reload();
      // best moment to ask: they just felt the whole loop
      setTimeout(() => window.dispatchEvent(new Event("nr:ask-feedback")), 1200);
    }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  if (err) return <Err msg={err} />;
  if (!data) return <p className="text-zinc-500">Loading…</p>;
  const won = pull?.won;
  const epic = data.cards.filter((c) => tierFor(c.askLamports) >= 4);
  const epicOdds = epic.reduce((a, c) => a + c.prob, 0);
  const top = data.cards.reduce<typeof data.cards[number] | null>((a, c) => (!a || c.askLamports > a.askLamports ? c : a), null);
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="glass led-surface space-y-3 p-4">
        <h2 className="text-xl font-bold">{data.pack.name}</h2>
        <p className="text-sm text-zinc-700">{data.cards.length} cards worth {sol(data.stats.totalAsk)} · rip for <Price lamports={data.price} /> · {data.stats.pulls} rips so far · <span className="text-nr">{sol(data.stats.pool)}</span> rent paid</p>
        <Err msg={msg} />
        <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <OddsChart cards={data.cards} live={at} />
          <div className="glass glass-strong p-3">
            <div className="mb-2 flex items-center justify-between gap-2"><span className="whitespace-nowrap text-xs font-bold uppercase tracking-wider text-neutral-700">Cards in this pack</span><span className="font-mono text-[10px] text-neutral-600">scroll →</span></div>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:thin] rail">
              {data.cards.map((c) => (
                <a key={c.id} href={addr(c.asset)} target="_blank" title="view asset on Solana Explorer" className="glass-interactive w-24 shrink-0 rounded-xl bg-white/50 p-1.5">
                  <div className="aspect-[3/4] overflow-hidden rounded-lg"><img src={c.imageUri} alt={c.name} className="h-full w-full object-contain" /></div>
                  <div className="mt-1 truncate text-[11px] font-medium">{c.name.replace(/ · PSA.*$/, "")}</div>
                  <div className="font-mono text-[11px] text-nr">{sol(c.askLamports)}</div>
                  <div className="font-mono text-[9px] font-semibold uppercase" style={{ color: RING[tierFor(c.askLamports)] }}>{TIER[tierFor(c.askLamports)]} · {(c.prob * 100).toFixed(0)}%</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
      <aside className="space-y-3 glass led-surface p-3">
        <PackReveal key={pull?.id ?? "idle"} busy={busy && !won} won={won ? { id: pull!.id, ...won } : null} onDone={() => setRevealDone(true)}>
          <Btn className="w-full cta-pulse" busy={busy} disabled={!data.open} onClick={doPull}>Rip pack · {sol(data.price)}{p ? ` (${usd(data.price, p)})` : ""}</Btn>
          {!data.open && <p className="text-center text-xs text-zinc-600">Needs 3+ cards listed</p>}
          {top && <p className="text-center text-xs font-medium text-zinc-700">{epic.length ? <><span className="font-semibold" style={{ color: RING[4] }}>{(epicOdds * 100).toFixed(0)}%</span> shot at epic+ · </> : null}best hit <span className="font-semibold" style={{ color: RING[tierFor(top.askLamports)] }}>{top.name.replace(/ · PSA.*$/, "")}</span> {sol(top.askLamports)}</p>}
          <p className="text-xs text-zinc-600">Provably fair: the random seed is locked onchain <em>before</em> you pay, so nobody can rig your hit. Check it yourself after the reveal.</p>
        </PackReveal>
        {won && revealDone && (
          <>
            <div className="text-center"><div className="font-medium">{won.name}</div><p className="text-sm">ask <Price lamports={won.askLamports} /></p></div>
            {pull!.status === "revealed" && (
              <>
                <p className="text-center text-sm font-medium text-zinc-800">Your call: <span className="font-mono text-zinc-900">{Math.max(0, Math.floor(left / 1000))}s</span> left, else you keep it</p>
                <div className="grid grid-cols-2 gap-2">
                  <Btn className="w-full" busy={busy} onClick={() => decide("keep")}>Keep</Btn>
                  <Ghost className="w-full" disabled={busy} onClick={() => decide("sellback")}>Cash out {sol(Math.floor(won.askLamports * 0.85))}</Ghost>
                </div>
                <p className="text-xs text-zinc-600">Keep — the card lands in your wallet and its seller gets {sol(won.askLamports)}. Cash out — instant {sol(Math.floor(won.askLamports * 0.85))} in SOL, and the sellers in this pack split rent.</p>
              </>
            )}
            {pull!.status === "kept" && <p className="text-sm font-medium text-nr">Yours. Card is in your wallet. <a className="underline" href={tx(pull!.settleSig!)} target="_blank">settle tx</a></p>}
            {pull!.status === "sold_back" && <p className="text-sm font-medium text-nr">Cashed out. SOL sent to you, rent credited to sellers. <a className="underline" href={tx(pull!.settleSig!)} target="_blank">payout tx</a></p>}
            <div className="flex gap-3 text-xs"><a className="underline text-zinc-600" href={`/pulls/${pull!.id}`} target="_blank" rel="noreferrer">verify the roll ↗</a><a className="underline text-zinc-600" href={tx(pull!.paymentSig)} target="_blank">payment tx</a></div>
            {pull!.status !== "revealed" && <Ghost className="w-full" onClick={() => { setPull(null); setRevealDone(false); }}>Pull again</Ghost>}
          </>
        )}
        <RecentDrops me={publicKey?.toBase58()} />
        <p className="text-[10px] text-zinc-600">You get {DECISION_MS / 60000} minutes to decide</p>
      </aside>
    </div>
  );
}
