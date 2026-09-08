// API=http://localhost:3000 pnpm tsx --env-file=.env.local scripts/stir.ts <listerWallet> [pulls=4]
// Demo buyer buys the cheapest listing of <listerWallet>, then pulls the pack(s) holding their cards and sells back → yield + payout for them.
import { LAMPORTS_PER_SOL, VersionedTransaction } from "@solana/web3.js";
import { named } from "./keys";

const API = process.env.API ?? "http://localhost:3000";
const target = process.argv[2]; const N = Number(process.argv[3] ?? 4);
if (!target) throw new Error("lister wallet arg required");
const buyer = named("buyer"); const me = buyer.publicKey.toBase58();
const j = async <T,>(path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> => {
  const r = await fetch(API + path, body ? { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) } : {});
  const d = await r.json(); if (!r.ok) throw new Error(`${path}: ${d.error}`); return d as T;
};
const sign = (b64: string) => { const tx = VersionedTransaction.deserialize(Buffer.from(b64, "base64")); tx.sign([buyer]); return Buffer.from(tx.serialize()).toString("base64"); };
type L = { id: string; lister: string; askLamports: number; packId: string; name: string };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const mine = (await j<L[]>("/api/listings")).filter((l) => l.lister === target).sort((a, b) => a.askLamports - b.askLamports);
  if (!mine.length) throw new Error(`${target} has no active listings — list cards in /me first`);
  console.log(`${target.slice(0, 6)} has ${mine.length} listings in packs:`, [...new Set(mine.map((l) => l.packId))].join(", "));
  // 1. buy their cheapest card at ask (NO_BUY=1 skips, keeps their listings intact)
  const cheap = mine[0];
  if (!process.env.NO_BUY) {
  const { tx } = await j<{ tx: string }>(`/api/listings/${cheap.id}/buy`, { buyer: me });
  const { soldSig } = await j<{ soldSig: string }>(`/api/listings/${cheap.id}/buy/submit`, { signed: sign(tx) });
  console.log("BOUGHT", cheap.name, (cheap.askLamports / LAMPORTS_PER_SOL).toFixed(3), "SOL →", soldSig.slice(0, 12));
  }
  // 2. pull the pack(s) containing their remaining cards, sell back each time (yield accrues to them pro-rata)
  let packs = [...new Set((process.env.NO_BUY ? mine : mine.slice(1)).map((l) => l.packId))];
  // skip packs the demo buyer cannot afford (devnet SOL is scarce)
  const { Connection } = await import("@solana/web3.js");
  const bal = await new Connection(process.env.RPC_URL!, "confirmed").getBalance(buyer.publicKey);
  const prices = await Promise.all(packs.map(async (pk) => ({ pk, price: (await j<{ price: number }>(`/api/packs/${pk}`)).price })));
  packs = prices.filter((x) => x.price < bal - 0.05 * LAMPORTS_PER_SOL).map((x) => x.pk);
  if (!packs.length) throw new Error(`buyer has ${(bal / LAMPORTS_PER_SOL).toFixed(3)} SOL, cheapest pack costs more`);
  console.log("pulling packs:", packs.join(", "), `(buyer ${(bal / LAMPORTS_PER_SOL).toFixed(3)} SOL)`);
  for (let i = 0; i < N; i++) {
    const pack = packs[i % packs.length];
    const p = await j<{ pullId: string; tx: string; price: number }>(`/api/packs/${pack}/pull`, { buyer: me });
    await j(`/api/packs/${pack}/pull/submit`, { pullId: p.pullId, signed: sign(p.tx) });
    const s = await j<{ won: L }>(`/api/pulls/${p.pullId}`);
    const keep = s.won.lister !== target && i === N - 1; // keep one non-target card at the end for variety
    const r = await j<{ status: string }>(`/api/pulls/${p.pullId}/decide`, { choice: keep ? "keep" : "sellback", buyer: me });
    console.log(`PULL ${i + 1}/${N} ${pack} → ${s.won.name} (${s.won.lister === target ? "THEIR card" : "other"}) ${r.status}`);
    await sleep(1200);
  }
  // 3. month-end payout (NO_PAYOUT=1 leaves the ledger unpaid so the demo button has something to pay)
  if (process.env.NO_PAYOUT) return console.log("skipped payout");
  const po = await j<{ paid: { lister: string; lamports: number; sig: string }[] }>("/api/yield/payout", {}, { "x-admin-key": process.env.ADMIN_KEY ?? "dev" });
  const theirs = po.paid.find((x) => x.lister === target);
  console.log("PAYOUT", po.paid.length, "listers;", target.slice(0, 6), "got", theirs ? (theirs.lamports / LAMPORTS_PER_SOL).toFixed(5) + " SOL " + theirs.sig.slice(0, 12) : "nothing (no sell-backs in their pack)");
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
