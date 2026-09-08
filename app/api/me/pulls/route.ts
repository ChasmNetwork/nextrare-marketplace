import { and, desc, eq, inArray } from "drizzle-orm";
import { db, listings, pulls } from "@/db";
import { handle } from "@/lib/route";

/** A buyer's rip history: what they hit, what they chose, and the txs that prove it. */
export const GET = handle(async (req) => {
  const buyer = new URL(req.url).searchParams.get("buyer");
  if (!buyer) throw new Error("buyer required");
  const rows = await db.select().from(pulls)
    .where(and(eq(pulls.buyer, buyer), inArray(pulls.status, ["revealed", "kept", "sold_back"])))
    .orderBy(desc(pulls.createdAt)).limit(24);
  const ids = rows.map((r) => r.wonListingId).filter((x): x is string => !!x);
  const cards = ids.length ? await db.select().from(listings).where(inArray(listings.id, ids)) : [];
  const byId = new Map(cards.map((c) => [c.id, c]));
  return rows.map((r) => {
    const w = r.wonListingId ? byId.get(r.wonListingId) : undefined;
    return {
      id: r.id, t: r.createdAt, packId: r.packId, status: r.status, price: r.priceLamports,
      name: w?.name ?? null, imageUri: w?.imageUri ?? null, ask: w?.askLamports ?? null,
      paymentSig: r.paymentSig, settleSig: r.settleSig, deadline: r.decisionDeadline,
    };
  });
});
