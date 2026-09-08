"use client";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { api, signBuilt, short, tx, addr } from "@/lib/client";
import { useJson, Btn, Card, Err, Price } from "@/components/ui";
import type { listings } from "@/db/schema";
type L = typeof listings.$inferSelect;

export function MarketGrid({ hero = true }: { hero?: boolean }) {
  const { publicKey, signTransaction } = useWallet();
  const { data, err, reload } = useJson<L[]>("/api/listings", [], 12000);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function buy(l: L) {
    if (!publicKey || !signTransaction) return setMsg("connect wallet");
    setBusy(l.id); setMsg(null);
    try {
      const { tx: built } = await api<{ tx: string }>(`/api/listings/${l.id}/buy`, { buyer: publicKey.toBase58() });
      const signed = await signBuilt(built, signTransaction);
      const { soldSig } = await api<{ soldSig: string }>(`/api/listings/${l.id}/buy/submit`, { signed });
      setDone(soldSig); reload();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(null); }
  }

  return (
    <div className="space-y-3">
      {hero && <div>
        <h1 className="text-3xl font-bold">List once. Sell two ways.</h1>
        <p className="mt-1 text-zinc-700">Buy any card outright, or rip a pack and hit it. Cards stay in the seller&rsquo;s wallet until that happens.</p>
      </div>}
      <Err msg={err ?? msg} />
      {done && <p className="text-sm font-medium text-nr">Bought. SOL to the seller, card to you, one transaction. <a className="underline" href={tx(done)} target="_blank">explorer</a></p>}
      <div className="rise grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
        {data?.map((l) => (
          <Card key={l.id} img={l.imageUri} name={l.name} badge={l.packId} href={addr(l.asset)}>
            <Price lamports={l.askLamports} className="text-sm" /><a href={addr(l.lister)} target="_blank" className="-mt-1 text-[11px] font-medium text-zinc-600 hover:text-zinc-900 hover:underline" title="lister wallet">by {short(l.lister)}</a>
            <Btn className="w-full" busy={busy === l.id} onClick={() => buy(l)} disabled={!!busy}>Buy now</Btn>
          </Card>
        ))}
        {data && !data.length && <p className="text-zinc-600">Nothing for sale yet. List a card in My cards.</p>}
      </div>
    </div>
  );
}
