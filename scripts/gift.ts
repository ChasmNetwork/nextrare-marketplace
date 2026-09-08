// pnpm tsx --env-file=.env.local scripts/gift.ts <wallet> — hand a demo wallet the unlisted cards + 0.5 SOL so it can list live
import { transfer, fetchAsset, fetchCollection } from "@metaplex-foundation/mpl-core";
import { createSignerFromKeypair, publicKey } from "@metaplex-foundation/umi";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { umi, COLLECTION } from "../lib/solana/umi";
import { conn } from "../lib/solana/connection";
import { funder, named, LISTERS } from "./keys";

async function main() {
  const to = process.argv[2]; if (!to) throw new Error("wallet arg required");
  const cards = JSON.parse(readFileSync("scripts/cards.json", "utf8")) as { asset: string; owner: string; name: string }[];
  const col = await fetchCollection(umi, COLLECTION());
  const kps = Object.fromEntries(LISTERS.map((n) => [named(n).publicKey.toBase58(), named(n)]));
  let sent = 0;
  for (const c of cards) {
    const a = await fetchAsset(umi, publicKey(c.asset));
    if (a.freezeDelegate?.frozen || a.owner !== c.owner) continue; // listed or already moved
    const owner = createSignerFromKeypair(umi, fromWeb3JsKeypair(kps[c.owner]));
    await transfer(umi, { asset: a, collection: col, newOwner: publicKey(to), authority: owner, payer: owner }).sendAndConfirm(umi);
    console.log("sent", c.name, "→", to.slice(0, 6)); sent++;
    await new Promise((r) => setTimeout(r, 1200));
  }
  const f = funder();
  const sig = await sendAndConfirmTransaction(conn, new Transaction().add(SystemProgram.transfer({ fromPubkey: f.publicKey, toPubkey: new PublicKey(to), lamports: 0.5 * LAMPORTS_PER_SOL })), [f]);
  console.log(sent, "cards +0.5 SOL", sig.slice(0, 12));
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
