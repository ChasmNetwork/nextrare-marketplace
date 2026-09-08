// pnpm setup — fund wallets, create Core collection, mint 24 cards to 3 listers. Idempotent-ish: skips collection if COLLECTION set.
import { createCollection, create, fetchCollection, fetchAssetsByCollection } from "@metaplex-foundation/mpl-core";
import { generateSigner, publicKey } from "@metaplex-foundation/umi";
import { LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { readFileSync, writeFileSync } from "node:fs";
import bs58 from "bs58";
import { conn } from "../lib/solana/connection";
import { umi, platformKp } from "../lib/solana/umi";
import { funder, named, LISTERS } from "./keys";

const ENV_FILE = process.env.ENV_FILE ?? ".env.local";
const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
const NAMES = ["Pikachu Reverse Foil · PSA 9", "Squirtle Art Rare · PSA 9", "Raboot Art Rare · PSA 10", "Jolteon ex · PSA 9", "Hitmonchan Holo · PSA 9", "Charizard · PSA 8", "Bulbasaur Art Rare · PSA 9", "Calyrex V · PSA 9", "Eevee ex · PSA 9", "Meowth 1st Ed · PSA 8"];

async function fund() {
  const f = funder();
  const bal = await conn.getBalance(f.publicKey);
  console.log("funder", f.publicKey.toBase58(), bal / LAMPORTS_PER_SOL, "SOL");
  const plan: [string, number][] = [["platform", 3], ...LISTERS.map((l) => [l, 0.15] as [string, number]), ["buyer", 1.5]];
  const need = plan.reduce((s, [, x]) => s + x, 0) + 0.01;
  if (bal < need * LAMPORTS_PER_SOL) {
    console.log(`funder needs ${need} SOL. Get devnet SOL at https://faucet.solana.com for ${f.publicKey.toBase58()} then re-run.`);
    // try direct airdrops as a fallback
    for (const [n] of plan) {
      try { await conn.requestAirdrop(named(n).publicKey, LAMPORTS_PER_SOL); console.log("airdropped 1 SOL →", n); } catch { console.log("airdrop rate-limited →", n); }
    }
    return false;
  }
  const tx = new Transaction();
  for (const [n, amt] of plan) {
    const kp = named(n);
    const have = await conn.getBalance(kp.publicKey);
    if (have >= amt * LAMPORTS_PER_SOL * 0.9) continue;
    tx.add(SystemProgram.transfer({ fromPubkey: f.publicKey, toPubkey: kp.publicKey, lamports: Math.round(amt * LAMPORTS_PER_SOL) }));
  }
  if (tx.instructions.length) console.log("funded:", await sendAndConfirmTransaction(conn, tx, [f]));
  return true;
}

async function main() {
  const platBal = await conn.getBalance(platformKp.publicKey);
  if (platBal < 1 * LAMPORTS_PER_SOL && !(await fund())) return;

  let collection = process.env.COLLECTION;
  if (!collection) {
    const signer = generateSigner(umi);
    await createCollection(umi, { collection: signer, name: "NextRare Cards", uri: `${BASE}/meta/collection.json` }).sendAndConfirm(umi);
    collection = signer.publicKey;
    const env = readFileSync(ENV_FILE, "utf8").replace(/^COLLECTION=.*$/m, `COLLECTION=${collection}`);
    writeFileSync(ENV_FILE, env);
    console.log("collection", collection);
  }
  const col = await fetchCollection(umi, publicKey(collection));
  // resume: pick up whatever is already minted (public RPC 429s mid-run)
  const existing = await fetchAssetsByCollection(umi, col.publicKey);
  const cards = existing.map((a) => ({ asset: a.publicKey as string, owner: a.owner as string, name: a.name, img: `/cards/card${a.uri.match(/meta\/(\d+)/)?.[1] ?? 0}.jpg` }));
  console.log("already minted:", cards.length);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (let i = cards.length; i < 24; i++) {
    await sleep(1500);
    const owner = named(LISTERS[i % 3]).publicKey.toBase58();
    const idx = i % 10;
    const name = `${NAMES[idx]} #${String(i + 1).padStart(3, "0")}`;
    const asset = generateSigner(umi);
    const r = await create(umi, { asset, collection: col, name, uri: `${BASE}/meta/${idx}.json`, owner: publicKey(owner) }).sendAndConfirm(umi);
    cards.push({ asset: asset.publicKey, owner, name, img: `/cards/card${idx}.jpg` });
    console.log(i + 1, name, "→", owner.slice(0, 6), bs58.encode(r.signature).slice(0, 12));
  }
  writeFileSync("scripts/cards.json", JSON.stringify(cards, null, 2));
  console.log("wrote scripts/cards.json");
}
main().catch((e) => { console.error(e); process.exit(1); });
