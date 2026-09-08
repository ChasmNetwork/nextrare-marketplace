// Simulates Phantom decorating a tx it signs (priority-fee ComputeBudget ix), so the submit path is
// exercised the way a real wallet exercises it. pnpm tsx --env-file=.env.local scripts/phantomsim.ts [pack]
import { ComputeBudgetProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { named } from "./keys";

const API = process.env.API ?? "http://localhost:3000";
const pack = process.argv[2] ?? "budget";
const buyer = named("buyer");
const j = async <T,>(p: string, b?: unknown): Promise<T> => {
  const r = await fetch(API + p, b ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) } : {});
  const d = await r.json(); if (!r.ok) throw new Error(`${p}: ${d.error}`); return d as T;
};

async function main() {
  const me = buyer.publicKey.toBase58();
  const built = await j<{ pullId: string; tx: string; price: number }>(`/api/packs/${pack}/pull`, { buyer: me });
  const tx = VersionedTransaction.deserialize(Buffer.from(built.tx, "base64"));
  const msg = TransactionMessage.decompile(tx.message);
  msg.instructions.unshift(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 }));
  const edited = new VersionedTransaction(msg.compileToV0Message());
  edited.sign([buyer]);
  const r = await j<{ paymentSig: string }>(`/api/packs/${pack}/pull/submit`, { pullId: built.pullId, signed: Buffer.from(edited.serialize()).toString("base64") });
  console.log("PRIORITY-FEE PULL OK", r.paymentSig.slice(0, 12));
  const s = await j<{ won: { name: string } }>(`/api/pulls/${built.pullId}`);
  console.log("won", s.won.name);
  await j(`/api/pulls/${built.pullId}/decide`, { choice: "sellback", buyer: me });
  console.log("sellback settled");

  // and a tampered tx must still be refused
  const b2 = await j<{ pullId: string; tx: string }>(`/api/packs/${pack}/pull`, { buyer: me });
  const t2 = VersionedTransaction.deserialize(Buffer.from(b2.tx, "base64"));
  const m2 = TransactionMessage.decompile(t2.message);
  m2.instructions = m2.instructions.filter((i) => i.programId.toBase58() !== "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
  const e2 = new VersionedTransaction(m2.compileToV0Message());
  e2.sign([buyer]);
  try {
    await j(`/api/packs/${pack}/pull/submit`, { pullId: b2.pullId, signed: Buffer.from(e2.serialize()).toString("base64") });
    throw new Error("SECURITY: stripped-memo tx was accepted");
  } catch (e) { console.log("tampered tx refused:", (e as Error).message); }
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
