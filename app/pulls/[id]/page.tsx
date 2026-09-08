"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useJson } from "@/components/ui";
import { tx, short } from "@/lib/client";

type Pull = { id: string; status: string; packId: string; buyer: string; priceLamports: number; paymentSig: string; commitHash: string; revealSecret?: string; blockhash: string; roll: string; snapshot: string; wonListingId: string; won: { name: string } | null };
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const fromHex = (h: string) => Uint8Array.from(h.match(/../g)!.map((x) => parseInt(x, 16)));

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="grid grid-cols-[160px_1fr] gap-2 border-t border-black/5 py-2 text-sm"><span className="text-zinc-500">{k}</span><span className="break-all font-mono text-xs text-zinc-800">{v}</span></div>;

export default function Verify() {
  const { id } = useParams<{ id: string }>();
  const { data: p, err } = useJson<Pull>(`/api/pulls/${id}`);
  const [check, setCheck] = useState<{ hashOk: boolean; roll: string; rollOk: boolean } | null>(null);
  useEffect(() => {
    if (!p?.revealSecret) return;
    (async () => {
      const secret = fromHex(p.revealSecret!);
      const hashOk = hex(await crypto.subtle.digest("SHA-256", secret)) === p.commitHash;
      const enc = new TextEncoder();
      const buf = new Uint8Array([...secret, ...enc.encode(p.blockhash), ...enc.encode(p.paymentSig)]);
      const d = new DataView(await crypto.subtle.digest("SHA-256", buf));
      const roll = d.getBigUint64(0, true).toString();
      setCheck({ hashOk, roll, rollOk: roll === p.roll });
    })();
  }, [p]);
  if (err) return <p className="text-red-300">{err}</p>;
  if (!p) return <p className="text-zinc-500">Loading…</p>;
  const snap = JSON.parse(p.snapshot) as { id: string; ask: number }[];
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Pull provenance</h1>
      <p className="text-zinc-600">Server committed <code>sha256(secret)</code> inside your payment tx (Memo) before your signature existed. Roll = <code>sha256(secret ‖ blockhash ‖ paymentSig)</code> as u64. Recomputed in your browser below.</p>
      <div className="glass glass-strong p-5">
        <Row k="status" v={p.status} />
        <Row k="pack / buyer" v={`${p.packId} / ${short(p.buyer)}`} />
        <Row k="payment tx" v={<a className="underline" href={tx(p.paymentSig)} target="_blank">{p.paymentSig}</a>} />
        <Row k="memo commit" v={`nr:${p.id}:${p.commitHash}`} />
        <Row k="revealed secret" v={p.revealSecret ?? "(not yet)"} />
        <Row k="blockhash" v={p.blockhash} />
        <Row k="roll (server)" v={p.roll} />
        <Row k="roll (browser)" v={check ? `${check.roll} ${check.rollOk ? "✓ match" : "✗ MISMATCH"}` : "…"} />
        <Row k="sha256(secret)==commit" v={check ? (check.hashOk ? "✓" : "✗") : "…"} />
        <Row k="candidate set" v={`${snap.length} cards, weights ∝ 1/ask → won ${p.won?.name ?? p.wonListingId}`} />
      </div>
    </div>
  );
}
