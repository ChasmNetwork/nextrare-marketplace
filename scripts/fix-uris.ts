// pnpm tsx --env-file=.env.local scripts/fix-uris.ts — repoint asset/collection metadata URIs at the deployed site
import { update, updateCollection, fetchAssetsByCollection, fetchCollection } from "@metaplex-foundation/mpl-core";
import { publicKey } from "@metaplex-foundation/umi";
import { umi, COLLECTION } from "../lib/solana/umi";

async function main() {
  const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://nextrare-marketplace.vercel.app";
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const col = await fetchCollection(umi, COLLECTION());
  await updateCollection(umi, { collection: col.publicKey, uri: `${BASE}/meta/collection.json` }).sendAndConfirm(umi);
  for (const a of await fetchAssetsByCollection(umi, col.publicKey)) {
    const uri = a.uri.replace(/^https?:\/\/[^/]+/, BASE);
    if (uri === a.uri) continue;
    await sleep(1500);
    await update(umi, { asset: a, collection: col, uri }).sendAndConfirm(umi);
    console.log(a.name, "→", uri);
  }
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
