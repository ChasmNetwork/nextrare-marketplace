// pnpm tsx --env-file=.env.local scripts/prelist.ts <wallet> [asks="0.35,0.85,1.8"]
// Mints slabs straight into <wallet> with the listing locks (FreezeDelegate frozen + TransferDelegate, platform authority)
// attached AT MINT, so the wallet owns real listed cards without ever signing. Demo-seeding only — normal listing is
// lister-signed via /api/listings/tx.
import { create, fetchCollection } from "@metaplex-foundation/mpl-core";
import { generateSigner, publicKey } from "@metaplex-foundation/umi";
import { db, listings } from "../db";
import { umi, COLLECTION, PLATFORM } from "../lib/solana/umi";
import { packFor } from "../lib/packs";
import { uid, now } from "../lib/route";

const NAMES = ["Charizard · PSA 8", "Meowth 1st Ed · PSA 8", "Squirtle Art Rare · PSA 9", "Eevee ex · PSA 9", "Calyrex V · PSA 9", "Raboot Art Rare · PSA 10"];
const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://nextrare-marketplace.vercel.app";

async function main() {
  const owner = process.argv[2];
  if (!owner) throw new Error("wallet arg required");
  const asks = (process.argv[3] ?? "0.35,0.85,1.8").split(",").map((x) => Math.round(parseFloat(x) * 1e9));
  const col = await fetchCollection(umi, COLLECTION());
  const auth = { type: "Address", address: PLATFORM } as const;
  for (const [i, askLamports] of asks.entries()) {
    const asset = generateSigner(umi);
    const idx = i % NAMES.length;
    const name = `${NAMES[idx]} #${String(200 + i)}`;
    const r = await create(umi, {
      asset, collection: col, name, uri: `${BASE}/meta/${idx}.json`, owner: publicKey(owner),
      plugins: [{ type: "FreezeDelegate", frozen: true, authority: auth }, { type: "TransferDelegate", authority: auth }],
    }).sendAndConfirm(umi);
    const sig = Buffer.from(r.signature).toString("base64");
    await db.insert(listings).values({
      id: uid(), asset: asset.publicKey, lister: owner, name, imageUri: `/cards/card${idx}.jpg`,
      askLamports, packId: packFor(askLamports), status: "active", listSig: sig, createdAt: now(),
    });
    console.log("PRE-LISTED", name, (askLamports / 1e9).toFixed(3), "SOL →", asset.publicKey);
  }
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
