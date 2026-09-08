import { eq } from "drizzle-orm";
import { db, listings } from "@/db";
import { handle, body, type P } from "@/lib/route";
import { listingById } from "@/lib/queries";
import { submitSigned } from "@/lib/solana/tx";

const CORE = "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d";

export const POST = handle(async (req, { params }: P<{ id: string }>) => {
  const { id } = await params;
  const { signed } = await body<{ signed: string }>(req);
  const l = await listingById(id);
  if (!l || l.status !== "pending_buy" || !l.pending) throw new Error("no pending buy");
  const p = JSON.parse(l.pending);
  try {
    // wallet may add a priority fee; the platform partial-signature protects the mpl-core half
    const soldSig = await submitSigned(signed, { ...p, intent: { payer: p.buyer, transfers: [{ to: l.lister, lamports: l.askLamports }], allowPrograms: [CORE] } });
    await db.update(listings).set({ status: "sold", buyer: p.buyer, soldSig, pending: null, pendingUntil: null }).where(eq(listings.id, id));
    return { soldSig };
  } catch (e) {
    await db.update(listings).set({ status: "active", pending: null, pendingUntil: null }).where(eq(listings.id, id));
    throw e;
  }
});
