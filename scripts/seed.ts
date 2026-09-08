// pnpm seed — listers (server-held demo keypairs) list their minted cards at spread asks so all 3 packs open. Needs dev server on :3000.
import { VersionedTransaction } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { named, LISTERS } from "./keys";

const API = process.env.API ?? "http://localhost:3000";
const cards = JSON.parse(readFileSync("scripts/cards.json", "utf8")) as { asset: string; owner: string; name: string }[];
// asks in SOL: 8 budget (<0.3), 8 mid (0.3–1), 8 chase (>=1); leave the last 3 unlisted so /me has cards to list live
const ASKS = [0.05, 0.08, 0.1, 0.12, 0.15, 0.2, 0.25, 0.28, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1.0, 1.2, 1.5, 2.0, 2.5];

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(API + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json(); if (!r.ok) throw new Error(j.error); return j as T;
}

async function main() {
  const kps = Object.fromEntries(LISTERS.map((n) => [named(n).publicKey.toBase58(), named(n)]));
  for (let i = 0; i < ASKS.length && i < cards.length; i++) {
    const c = cards[i]; const kp = kps[c.owner]; await new Promise((r) => setTimeout(r, 1200));
    try {
      const built = await post<{ tx: string; messageHash: string; blockhash: string; lastValidBlockHeight: number }>("/api/listings/tx", { asset: c.asset, lister: c.owner });
      const tx = VersionedTransaction.deserialize(Buffer.from(built.tx, "base64")); tx.sign([kp]);
      const row = await post<{ packId: string }>("/api/listings", { ...built, tx: undefined, signed: Buffer.from(tx.serialize()).toString("base64"), asset: c.asset, lister: c.owner, askLamports: Math.round(ASKS[i] * 1e9) });
      console.log(i + 1, c.name, ASKS[i], "SOL →", row.packId);
    } catch (e) { console.log(i + 1, c.name, "FAILED", (e as Error).message.split("\n")[0]); }
  }
}
main();
