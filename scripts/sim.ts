// API=https://nextrare-marketplace.vercel.app pnpm tsx --env-file=.env.local scripts/sim.ts [wallets=10]
// Labelled load simulation. Spins up fresh wallets, funds them from the local funder key, mints each one a slab,
// and runs the REAL flow through the public API: connect (ref "sim"), list, rip 1-3 packs, keep or cash out.
// Every wallet registers with ref="sim" so /traction shows them in their own "Simulated" bucket and they never
// count toward the real-user number. Keypairs land in .keys/sim/ (gitignored).
import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, VersionedTransaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { create, fetchCollection } from "@metaplex-foundation/mpl-core";
import { generateSigner, publicKey } from "@metaplex-foundation/umi";
import { writeFileSync } from "node:fs";
import { funder } from "./keys";
import { umi, COLLECTION } from "../lib/solana/umi";

const API = process.env.API ?? "http://localhost:3000";
const N = Number(process.argv[2] ?? 10);
const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://nextrare-marketplace.vercel.app";
const NAMES = ["Pikachu Reverse Foil · PSA 9", "Squirtle Art Rare · PSA 9", "Raboot Art Rare · PSA 10", "Jolteon ex · PSA 9", "Hitmonchan Holo · PSA 9", "Charizard · PSA 8", "Bulbasaur Art Rare · PSA 9", "Calyrex V · PSA 9", "Eevee ex · PSA 9", "Meowth 1st Ed · PSA 8"];
const conn = new Connection(process.env.RPC_URL!, "confirmed");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const j = async <T,>(path: string, body?: unknown): Promise<T> => {
  const r = await fetch(API + path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
  const d = await r.json(); if (!r.ok) throw new Error(`${path}: ${d.error}`); return d as T;
};
const signWith = (kp: Keypair) => (b64: string) => { const tx = VersionedTransaction.deserialize(Buffer.from(b64, "base64")); tx.sign([kp]); return Buffer.from(tx.serialize()).toString("base64"); };

async function fund(to: Keypair, sol: number) {
  const f = funder();
  // devnet RPC drops blockhashes under load; three tries with a fresh one each time
  for (let a = 0; ; a++) {
    try {
      const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: f.publicKey, toPubkey: to.publicKey, lamports: Math.round(sol * LAMPORTS_PER_SOL) }));
      return await sendAndConfirmTransaction(conn, tx, [f], { commitment: "confirmed" });
    } catch (e) { if (a >= 2) throw e; await sleep(1500); }
  }
}

async function mint(owner: string, i: number) {
  const col = await fetchCollection(umi, COLLECTION());
  const asset = generateSigner(umi); const idx = i % NAMES.length;
  const name = `${NAMES[idx]} #${String(300 + i + Number(process.env.OFFSET ?? 0))}`;
  await create(umi, { asset, collection: col, name, uri: `${BASE}/meta/${idx}.json`, owner: publicKey(owner) }).sendAndConfirm(umi);
  return { asset: asset.publicKey as string, name };
}

async function one(i: number) {
  const kp = Keypair.generate(); const me = kp.publicKey.toBase58(); const sign = signWith(kp);
  writeFileSync(`.keys/sim/${me}.json`, JSON.stringify([...kp.secretKey]));
  // 3 in 10 get enough for a mid pack, the rest stick to budget
  const rich = !process.env.BUDGET_ONLY && i % 3 === 0; const sol = rich ? 0.085 : 0.036;
  await fund(kp, sol);
  await j("/api/users/seen", { wallet: me, ref: "sim" });
  console.log(`[${i + 1}/${N}] ${me.slice(0, 6)} funded ${sol} SOL`);
  await sleep(rnd(800, 2000));

  // list one card at a band-appropriate price (budget <0.03, mid 0.03-0.1)
  const { asset, name } = await mint(me, i);
  const ask = Math.round((rich ? rnd(0.031, 0.09) : rnd(0.004, 0.028)) * LAMPORTS_PER_SOL);
  const built = await j<{ tx: string; messageHash: string; blockhash: string; lastValidBlockHeight: number }>("/api/listings/tx", { asset, lister: me });
  await j("/api/listings", { ...built, tx: undefined, signed: sign(built.tx), asset, lister: me, askLamports: ask });
  console.log(`   listed ${name} @ ${(ask / LAMPORTS_PER_SOL).toFixed(3)}`);
  await sleep(rnd(800, 2000));

  // rip 1-3 packs the wallet can afford; cash out ~85% of the time, keep otherwise
  const rips = 1 + Math.floor(Math.random() * 3);
  for (let r = 0; r < rips; r++) {
    const bal = await conn.getBalance(kp.publicKey);
    const packs = (await Promise.all(["budget", "mid"].map(async (pk) => ({ pk, ...(await j<{ price: number; open: boolean }>(`/api/packs/${pk}`)) }))))
      .filter((p) => p.open && p.price < bal - 0.004 * LAMPORTS_PER_SOL);
    if (!packs.length) { console.log("   out of SOL, stopping"); break; }
    const pack = pick(packs).pk;
    try {
      const p = await j<{ pullId: string; tx: string }>(`/api/packs/${pack}/pull`, { buyer: me });
      await j(`/api/packs/${pack}/pull/submit`, { pullId: p.pullId, signed: sign(p.tx) });
      const s = await j<{ won: { name: string; askLamports: number } }>(`/api/pulls/${p.pullId}`);
      const choice = Math.random() < 0.85 ? "sellback" : "keep";
      await j(`/api/pulls/${p.pullId}/decide`, { choice, buyer: me });
      console.log(`   rip ${pack} → ${s.won.name} → ${choice}`);
    } catch (e) { console.log("   rip failed:", (e as Error).message); }
    await sleep(rnd(1500, 4000));
  }
}

async function main() {
  const f = funder();
  console.log("funder", f.publicKey.toBase58(), (await conn.getBalance(f.publicKey)) / LAMPORTS_PER_SOL, "SOL · API", API);
  for (let i = 0; i < N; i++) { try { await one(i); } catch (e) { console.log(`[${i + 1}] failed:`, (e as Error).message); } }
  console.log("done. funder left:", (await conn.getBalance(f.publicKey)) / LAMPORTS_PER_SOL);
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
