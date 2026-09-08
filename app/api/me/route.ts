import { eq, desc } from "drizzle-orm";
import { db, listings, pulls } from "@/db";
import { handle } from "@/lib/route";
import { ownedCards } from "@/lib/solana/core";

export const GET = handle(async (req) => {
  const owner = new URL(req.url).searchParams.get("owner");
  if (!owner) throw new Error("owner required");
  const [cards, mine, myPulls] = await Promise.all([ownedCards(owner), db.select().from(listings).where(eq(listings.lister, owner)).orderBy(desc(listings.createdAt)), db.select({ id: pulls.id }).from(pulls).where(eq(pulls.buyer, owner))]);
  const listedAssets = new Set(mine.filter((l) => ["active", "reserved", "pending_buy"].includes(l.status)).map((l) => l.asset));
  return { unlisted: cards.filter((c) => !listedAssets.has(c.asset) && !c.frozen), listings: mine, pulls: myPulls.length };
});
