// pnpm tsx --env-file=.env.localnet scripts/e2e.ts — buyer keypair drives the full loop through the HTTP API (no browser).
import { Connection, LAMPORTS_PER_SOL, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { named } from "./keys";

const API = process.env.API ?? "http://localhost:3001";
const conn = new Connection(process.env.RPC_URL!, "confirmed");
const buyer = named("buyer");
const me = buyer.publicKey.toBase58();
const assert = (c: unknown, m: string) => { if (!c) throw new Error("ASSERT " + m); };
const j = async <T,>(path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> => {
  const r = await fetch(API + path, body ? { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) } : {});
  const d = await r.json(); if (!r.ok) throw new Error(`${path}: ${d.error}`); return d as T;
};
const sign = (b64: string) => { const tx = VersionedTransaction.deserialize(Buffer.from(b64, "base64")); tx.sign([buyer]); return Buffer.from(tx.serialize()).toString("base64"); };
const bal = (pk: string) => conn.getBalance(new PublicKey(pk));
type L = { id: string; asset: string; lister: string; askLamports: number; packId: string; status: string; name: string };

async function main() {
  console.log("buyer", me, (await bal(me)) / LAMPORTS_PER_SOL, "SOL");

  // 1. atomic buy
  const listings = await j<L[]>("/api/listings");
  const target = listings.find((l) => l.packId === "budget")!;
  const before = await bal(target.lister);
  const { tx } = await j<{ tx: string }>(`/api/listings/${target.id}/buy`, { buyer: me });
  const { soldSig } = await j<{ soldSig: string }>(`/api/listings/${target.id}/buy/submit`, { signed: sign(tx) });
  assert((await bal(target.lister)) - before === target.askLamports, "lister received exact ask");
  const owner = await conn.getAccountInfo(new PublicKey(target.asset));
  assert(owner, "asset exists");
  console.log("BUY ok", target.name, soldSig.slice(0, 12));

  // 2. pull → keep
  const pk1 = await j<{ price: number; open: boolean }>("/api/packs/mid");
  assert(pk1.open, "mid pack open");
  const p1 = await j<{ pullId: string; tx: string; price: number }>("/api/packs/mid/pull", { buyer: me });
  assert(p1.price === pk1.price, "pull price == EV");
  const r1 = await j<{ wonListingId: string; roll: string }>("/api/packs/mid/pull/submit", { pullId: p1.pullId, signed: sign(p1.tx) });
  const s1 = await j<{ status: string; won: L }>(`/api/pulls/${p1.pullId}`);
  assert(s1.status === "revealed" && s1.won.status === "reserved", "revealed + reserved");
  const lb = await bal(s1.won.lister);
  const k = await j<{ status: string; sig: string }>(`/api/pulls/${p1.pullId}/decide`, { choice: "keep", buyer: me });
  assert(k.status === "kept", "kept");
  assert((await bal(s1.won.lister)) - lb === s1.won.askLamports, "lister paid ask on keep");
  console.log("PULL+KEEP ok", s1.won.name, "roll", r1.roll.slice(0, 8), k.sig.slice(0, 12));

  // 3. pull → sellback → yield rows
  const p2 = await j<{ pullId: string; tx: string; price: number }>("/api/packs/mid/pull", { buyer: me });
  await j("/api/packs/mid/pull/submit", { pullId: p2.pullId, signed: sign(p2.tx) });
  const s2 = await j<{ won: L }>(`/api/pulls/${p2.pullId}`);
  const bb = await bal(me);
  const sb = await j<{ status: string; split: { buyerPayout: number; pool: number; shares: { lister: string; amount: number }[] } }>(`/api/pulls/${p2.pullId}/decide`, { choice: "sellback", buyer: me });
  assert(sb.status === "sold_back", "sold back");
  assert((await bal(me)) - bb === sb.split.buyerPayout, "buyer got 85%");
  assert(sb.split.buyerPayout === Math.floor(s2.won.askLamports * 0.85), "85% of ask");
  const after = await j<L[]>("/api/listings");
  assert(after.find((l) => l.id === s2.won.id)?.status === "active", "card back to active");
  const y = await j<{ unpaid: number; byPack: Record<string, { unpaid: number }> }>(`/api/yield?lister=${s2.won.lister}`);
  assert(y.byPack.mid?.unpaid > 0, "lister of sold-back card has mid-pack yield");
  const poolSum = sb.split.shares.reduce((a, s) => a + s.amount, 0);
  assert(poolSum <= sb.split.pool && poolSum > sb.split.pool * 0.99, "pool fully distributed (minus dust)");
  console.log("PULL+SELLBACK ok", s2.won.name, "payout", sb.split.buyerPayout / 1e9, "pool", sb.split.pool / 1e9, "→", sb.split.shares.length, "listers");

  // 4. month-end payout
  const listers = [...new Set(sb.split.shares.map((s) => s.lister))];
  const pre = Object.fromEntries(await Promise.all(listers.map(async (l) => [l, await bal(l)])));
  const po = await j<{ paid: { lister: string; lamports: number; sig: string }[] }>("/api/yield/payout", {}, { "x-admin-key": "dev" });
  for (const p of po.paid) assert((await bal(p.lister)) - pre[p.lister] === p.lamports, "payout landed " + p.lister.slice(0, 4));
  const y2 = await j<{ unpaid: number; payouts: unknown[] }>(`/api/yield?lister=${s2.won.lister}`);
  assert(y2.unpaid === 0 && y2.payouts.length >= 1, "ledger settled");
  console.log("PAYOUT ok", po.paid.length, "listers", po.paid[0].sig.slice(0, 12));

  // 5. verify page data recompute
  const v = await j<{ revealSecret: string; commitHash: string; blockhash: string; paymentSig: string; roll: string }>(`/api/pulls/${p2.pullId}`);
  const { createHash } = await import("node:crypto");
  assert(createHash("sha256").update(Buffer.from(v.revealSecret, "hex")).digest("hex") === v.commitHash, "commit matches");
  const roll = createHash("sha256").update(Buffer.from(v.revealSecret, "hex")).update(v.blockhash).update(v.paymentSig).digest().readBigUInt64LE(0).toString();
  assert(roll === v.roll, "roll recomputes");
  const ptx = await conn.getTransaction(v.paymentSig, { maxSupportedTransactionVersion: 0 });
  assert(ptx?.meta?.logMessages?.some((l) => l.includes(`nr:${p2.pullId}:${v.commitHash}`)), "memo commit onchain");
  console.log("PROVENANCE ok");
  console.log("\nALL GREEN");
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
