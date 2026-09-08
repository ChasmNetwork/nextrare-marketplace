import { eq } from "drizzle-orm";
import { db, listings } from "@/db";
import { handle, body, now, type P } from "@/lib/route";
import { listingById } from "@/lib/queries";
import { buildBuyTx } from "@/lib/solana/core";

export const POST = handle(async (req, { params }: P<{ id: string }>) => {
  const { id } = await params;
  const { buyer } = await body<{ buyer: string }>(req);
  const l = await listingById(id);
  if (!l) throw new Error("not found");
  if (l.status !== "active" && !(l.status === "pending_buy" && (l.pendingUntil ?? 0) < now())) throw new Error("not available");
  if (l.lister === buyer) throw new Error("that is your own card");
  const built = await buildBuyTx(l, buyer);
  await db.update(listings).set({ status: "pending_buy", pendingUntil: now() + 90_000, pending: JSON.stringify({ buyer, ...built, tx: undefined }) }).where(eq(listings.id, id));
  return { tx: built.tx };
});
