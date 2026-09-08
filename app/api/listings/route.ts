import { desc, eq } from "drizzle-orm";
import { db, listings } from "@/db";
import { handle, body, uid, now } from "@/lib/route";
import { submitSigned } from "@/lib/solana/tx";
import { verifyListed } from "@/lib/solana/core";
import { packFor } from "@/lib/packs";

const CORE = "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d";

export const GET = handle(async () => db.select().from(listings).where(eq(listings.status, "active")).orderBy(desc(listings.createdAt)));

type Body = { signed: string; messageHash: string; blockhash: string; lastValidBlockHeight: number; asset: string; lister: string; askLamports: number };
/** Lister sent the signed lock tx; we send it, then trust the chain (not the client) for listed state. */
export const POST = handle(async (req) => {
  const b = await body<Body>(req);
  if (!(b.askLamports > 0)) throw new Error("bad ask");
  const listSig = await submitSigned(b.signed, { ...b, intent: { payer: b.lister, allowPrograms: [CORE] } });
  const v = await verifyListed(b.asset, b.lister);
  if (!v.ok) throw new Error("onchain state not locked to platform");
  const idx = v.uri.match(/meta\/(\d+)\.json/)?.[1] ?? "0";
  const row = { id: uid(), asset: b.asset, lister: b.lister, name: v.name, imageUri: `/cards/card${idx}.jpg`, askLamports: Math.round(b.askLamports), packId: packFor(b.askLamports), status: "active", listSig, createdAt: now() };
  await db.insert(listings).values(row).onConflictDoUpdate({ target: listings.asset, set: { ...row, id: undefined } });
  return row;
});
