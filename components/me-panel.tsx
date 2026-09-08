"use client";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSearchParams } from "next/navigation";
import { api, signBuilt, sol, short, tx, addr } from "@/lib/client";
import { useJson, Btn, Ghost, Card, Err, Price, useSolPrice, BADGE } from "@/components/ui";
import { YieldChart } from "@/components/yield-chart";
import { PullHistory } from "@/components/pull-history";
import { Stat } from "@/components/stat";
import type { listings } from "@/db/schema";
type L = typeof listings.$inferSelect;
type Me = { unlisted: { asset: string; name: string; uri: string }[]; listings: L[] };
type Y = { events: { t: number; packId: string; amount: number }[]; byPack: Record<string, { unpaid: number; paid: number; events: number }>; unpaid: number; payouts: { period: string; amountLamports: number; sig: string }[] };

export function MePanel() {
  const { publicKey, signTransaction } = useWallet();
  const as = useSearchParams().get("as"); // ponytail: ?as=<pubkey> views any lister read-only (demo)
  const me = as ?? publicKey?.toBase58() ?? null;
  const { data, err, reload } = useJson<Me>(me ? `/api/me?owner=${me}` : null, [], 15000);
  const y = useJson<Y>(me ? `/api/yield?lister=${me}` : null, [], 10000);
  const solUsd = useSolPrice();
  const lifetime = Object.values(y.data?.byPack ?? {}).reduce((a, v) => a + v.unpaid + v.paid, 0);
  const toUsd = (l: number) => (solUsd ? (l / 1e9) * solUsd : null);
  const [ask, setAsk] = useState<Record<string, string>>({});
  // ponytail: suggested asks spread the wallet's cards across all three packs so one click populates every band
  const SUGGEST = [0.35, 0.85, 1.8];
  const suggested = (i: number) => String(SUGGEST[i % SUGGEST.length]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const idx = (uri: string) => uri.match(/meta\/(\d+)\.json/)?.[1] ?? "0";

  async function list(asset: string, override?: string) {
    if (!me || !signTransaction) return;
    const askSol = parseFloat(override ?? ask[asset] ?? ""); if (!(askSol > 0)) return setMsg("type a price in SOL");
    setBusy(asset); setMsg(null);
    try {
      const built = await api<{ tx: string; messageHash: string; blockhash: string; lastValidBlockHeight: number }>("/api/listings/tx", { asset, lister: me });
      const signed = await signBuilt(built.tx, signTransaction);
      await api("/api/listings", { ...built, tx: undefined, signed, asset, lister: me, askLamports: Math.round(askSol * 1e9) });
      reload();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(null); }
  }
  async function listAll() {
    const cards = data?.unlisted ?? [];
    setMsg(null);
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const v = ask[c.asset] ?? suggested(i);
      setAsk((a) => ({ ...a, [c.asset]: v }));
      setBusy(c.asset);
      try {
        const built = await api<{ tx: string; messageHash: string; blockhash: string; lastValidBlockHeight: number }>("/api/listings/tx", { asset: c.asset, lister: me });
        const signed = await signBuilt(built.tx, signTransaction!);
        await api("/api/listings", { ...built, tx: undefined, signed, asset: c.asset, lister: me, askLamports: Math.round(parseFloat(v) * 1e9) });
      } catch (e) { setMsg((e as Error).message); break; } finally { setBusy(null); }
    }
    reload();
  }
  async function delist(l: L) {
    setBusy(l.id); setMsg(null);
    try { await api(`/api/listings/${l.id}/delist`, { lister: me }); reload(); } catch (e) { setMsg((e as Error).message); } finally { setBusy(null); }
  }
  async function payout() {
    setBusy("payout"); setMsg(null);
    try { const r = await api<{ paid: { lister: string; lamports: number }[] }>("/api/yield/payout", { lister: me }, { "x-admin-key": "dev" }); setMsg(r.paid.length ? `Sent ${sol(r.paid[0].lamports)} to your wallet.` : "Nothing pending yet."); y.reload(); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(null); }
  }

  if (!me) return <p className="text-zinc-600">Connect a wallet (devnet) to see your cards.</p>;
  return (
    <div className="space-y-3">
      <Err msg={err ?? msg} />
      <section className="glass led-surface p-4">
        <h2 className="text-xl font-semibold">Earnings</h2>
        <p className="text-sm text-zinc-700">Someone cashes out in your pack, you earn rent. Your cut = your card&rsquo;s price vs the whole pack. Paid monthly.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Pending" sol={(y.data?.unpaid ?? 0) / 1e9} usd={toUsd(y.data?.unpaid ?? 0)} hint="withdraw any time" accent="#dd2023" />
          <Stat label="Total earned" sol={lifetime / 1e9} usd={toUsd(lifetime)} hint={`${y.data?.events.length ?? 0} cash-outs paid you`} />
          <Stat label="Already paid" sol={(y.data?.payouts ?? []).reduce((a, p) => a + p.amountLamports, 0) / 1e9} usd={toUsd((y.data?.payouts ?? []).reduce((a, p) => a + p.amountLamports, 0))} hint={`${y.data?.payouts.length ?? 0} payouts`} />
        </div>
        <div className="mt-4"><YieldChart events={y.data?.events ?? []} live={y.at} /></div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Btn busy={busy === "payout"} disabled={!y.data?.unpaid} onClick={payout}>Withdraw {sol(y.data?.unpaid ?? 0)}</Btn>
          {y.data?.payouts.slice(0, 3).map((p) => <a key={p.sig} className="glass glass-pill glass-interactive inline-flex h-9 items-center px-3 font-mono text-[11px] font-semibold text-zinc-800" href={tx(p.sig)} target="_blank" title="payout transaction">paid {p.period} · {sol(p.amountLamports)} ↗</a>)}
        </div>
      </section>
      <section className="glass led-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Not listed yet</h2>
          {!!data?.unlisted.length && !as && <Btn busy={!!busy} onClick={listAll}>List all {data.unlisted.length} cards</Btn>}
        </div>
        <p className="text-sm text-zinc-700">Your card stays in <em>your</em> wallet, locked so nobody can move it. It leaves only when someone buys it or keeps it from a pack.</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
          {data?.unlisted.map((c, i) => (
            <Card key={c.asset} img={`/cards/card${idx(c.uri)}.jpg`} name={c.name} href={addr(c.asset)}>
              <input value={ask[c.asset] ?? ""} onChange={(e) => setAsk({ ...ask, [c.asset]: e.target.value })} placeholder={`ask SOL · ${suggested(i)}`} className="glass-input" />
              <Btn className="w-full" busy={busy === c.asset} onClick={() => { setAsk((a) => ({ ...a, [c.asset]: a[c.asset] ?? suggested(i) })); list(c.asset, ask[c.asset] ?? suggested(i)); }}>List · {ask[c.asset] || suggested(i)}</Btn>
            </Card>
          ))}
          {data && !data.unlisted.length && <p className="text-sm text-zinc-600">Every card in this wallet is listed.</p>}
        </div>
      </section>
      <PullHistory me={me} />
      <section className="glass led-surface p-4">
        <h2 className="text-xl font-semibold">My listings</h2>
        {data && !data.listings.length && <p className="text-sm text-zinc-700">Nothing listed yet. List one above and it goes on sale <em>and</em> into a pack instantly.</p>}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
          {data?.listings.map((l) => (
            <Card key={l.id} img={l.imageUri} name={l.name} badge={l.status} href={addr(l.asset)}>
              <div className="flex flex-col"><Price lamports={l.askLamports} className="text-sm" /><span className={`mt-1 w-fit rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${BADGE[l.packId] ?? BADGE.default}`}>{l.packId}</span></div>
              {l.status === "active" && <Ghost className="w-full" disabled={busy === l.id} onClick={() => delist(l)}>Delist</Ghost>}
              {(l.status === "sold" || l.status === "pulled") && <a className="glass glass-interactive inline-flex h-9 w-full max-w-full items-center justify-center gap-1 rounded-full px-3 text-xs font-semibold leading-none text-zinc-900" href={tx(l.soldSig!)} target="_blank" title={`paid to ${l.buyer}`}><span className="min-w-0 truncate">paid → {short(l.buyer!)}</span><span aria-hidden className="shrink-0">↗</span></a>}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

