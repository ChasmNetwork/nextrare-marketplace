import { eq } from "drizzle-orm";
import { db, listings, pulls, yieldLedger } from "@/db";
import { uid, now } from "./route";
import { activeInPack, toCards, listingById } from "./queries";
import { sellbackSplit } from "./pack-math";
import { deliverKeep, payLamports } from "./solana/core";

export async function settle(pullId: string, choice: "keep" | "sellback") {
  const pull = await db.query.pulls.findFirst({ where: eq(pulls.id, pullId) });
  if (!pull || pull.status !== "revealed" || !pull.wonListingId) throw new Error("nothing to settle");
  const won = await listingById(pull.wonListingId);
  if (!won) throw new Error("listing missing");
  if (choice === "keep") {
    const sig = await deliverKeep(won, pull.buyer);
    await db.update(listings).set({ status: "pulled", buyer: pull.buyer, soldSig: sig }).where(eq(listings.id, won.id));
    await db.update(pulls).set({ status: "kept", settleSig: sig }).where(eq(pulls.id, pullId));
    return { status: "kept", sig };
  }
  const active = toCards([won, ...(await activeInPack(pull.packId))]); // won card returns to the pool and shares too
  const split = sellbackSplit({ id: won.id, ask: won.askLamports, lister: won.lister }, active);
  const sig = await payLamports(pull.buyer, split.buyerPayout);
  const t = now();
  const rows = split.shares.filter((s) => s.amount > 0).map((s) => ({ id: uid(), packId: pull.packId, pullId, listingId: s.id, lister: s.lister!, shareBps: s.bps, amountLamports: s.amount, createdAt: t }));
  if (rows.length) await db.insert(yieldLedger).values(rows);
  await db.update(listings).set({ status: "active" }).where(eq(listings.id, won.id));
  await db.update(pulls).set({ status: "sold_back", settleSig: sig }).where(eq(pulls.id, pullId));
  return { status: "sold_back", sig, split };
}
