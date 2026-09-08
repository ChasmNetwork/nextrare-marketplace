import { eq, desc, inArray } from "drizzle-orm";
import { db, listings, pulls, yieldLedger } from "@/db";
import { handle } from "@/lib/route";

/** Protocol-wide numbers for the dashboard header. */
export const GET = handle(async () => {
  const [active, ps, ys] = await Promise.all([
    db.select().from(listings).where(eq(listings.status, "active")),
    db.select().from(pulls).where(inArray(pulls.status, ["kept", "sold_back"])).orderBy(desc(pulls.createdAt)),
    db.select().from(yieldLedger),
  ]);
  const poolByPull: Record<string, number> = {};
  for (const y of ys) poolByPull[y.pullId] = (poolByPull[y.pullId] ?? 0) + y.amountLamports;
  const byPack: Record<string, { cards: number; value: number }> = {};
  for (const l of active) { const b = (byPack[l.packId] ??= { cards: 0, value: 0 }); b.cards++; b.value += l.askLamports; }
  return {
    collection: process.env.COLLECTION ?? null, platform: process.env.NEXT_PUBLIC_PLATFORM ?? null,
    listings: active.length, value: active.reduce((a, l) => a + l.askLamports, 0), listers: new Set(active.map((l) => l.lister)).size,
    pulls: ps.length, kept: ps.filter((x) => x.status === "kept").length, soldBack: ps.filter((x) => x.status === "sold_back").length,
    volume: ps.reduce((a, x) => a + x.priceLamports, 0), pool: ys.reduce((a, y) => a + y.amountLamports, 0),
    byPack, activity: ps.map((x) => ({ t: x.createdAt, status: x.status, price: x.priceLamports, pool: poolByPull[x.id] ?? 0, packId: x.packId })).reverse(),
  };
});
