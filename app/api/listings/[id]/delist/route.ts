import { eq } from "drizzle-orm";
import { db, listings } from "@/db";
import { handle, body, type P } from "@/lib/route";
import { listingById } from "@/lib/queries";
import { delist } from "@/lib/solana/core";

// ponytail: caller passes lister pubkey, no signature auth. Add signMessage if griefing matters.
export const POST = handle(async (req, { params }: P<{ id: string }>) => {
  const { id } = await params;
  const { lister } = await body<{ lister: string }>(req);
  const l = await listingById(id);
  if (!l || l.lister !== lister) throw new Error("not yours");
  if (l.status !== "active") throw new Error(`cannot delist while ${l.status}`);
  const sig = await delist(l.asset);
  await db.update(listings).set({ status: "delisted", soldSig: sig }).where(eq(listings.id, id));
  return { sig };
});
