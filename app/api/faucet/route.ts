import { create, fetchCollection } from "@metaplex-foundation/mpl-core";
import { generateSigner, publicKey } from "@metaplex-foundation/umi";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { handle, body } from "@/lib/route";
import { conn } from "@/lib/solana/connection";
import { umi, COLLECTION } from "@/lib/solana/umi";
import { ownedCards, payLamports } from "@/lib/solana/core";

const NAMES = ["Pikachu Reverse Foil · PSA 9", "Squirtle Art Rare · PSA 9", "Raboot Art Rare · PSA 10", "Jolteon ex · PSA 9", "Hitmonchan Holo · PSA 9", "Charizard · PSA 8", "Bulbasaur Art Rare · PSA 9", "Calyrex V · PSA 9", "Eevee ex · PSA 9", "Meowth 1st Ed · PSA 8"];
const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://nextrare-marketplace.vercel.app";
const SOL_GIFT = 0.25 * LAMPORTS_PER_SOL;

/** Demo faucet: mint 2 fresh slabs to the wallet + 0.25 SOL for fees. Once per wallet (refuses if it already holds our cards or ≥ 0.5 SOL). */
export const POST = handle(async (req) => {
  const { wallet } = await body<{ wallet: string }>(req);
  const pk = new PublicKey(wallet); // throws on garbage
  const [cards, bal] = await Promise.all([ownedCards(wallet), conn.getBalance(pk)]);
  if (cards.length) throw new Error("This wallet already has demo cards. List one!");
  const col = await fetchCollection(umi, COLLECTION());
  const minted: { asset: string; name: string }[] = [];
  for (let i = 0; i < 2; i++) {
    const idx = Math.floor(Math.random() * NAMES.length);
    const asset = generateSigner(umi);
    const name = `${NAMES[idx]} #${String(100 + Math.floor(Math.random() * 900))}`;
    await create(umi, { asset, collection: col, name, uri: `${BASE}/meta/${idx}.json`, owner: publicKey(wallet) }).sendAndConfirm(umi);
    minted.push({ asset: asset.publicKey, name });
  }
  const solSig = bal < 0.5 * LAMPORTS_PER_SOL ? await payLamports(wallet, SOL_GIFT) : null;
  return { minted, solSig, sol: solSig ? SOL_GIFT / LAMPORTS_PER_SOL : 0 };
});
export const runtime = "nodejs";
export const maxDuration = 60;
void bs58;
