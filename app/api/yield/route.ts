import { eq, desc } from "drizzle-orm";
import { db, yieldLedger, payouts } from "@/db";
import { handle } from "@/lib/route";

export const GET = handle(async (req) => {
  const lister = new URL(req.url).searchParams.get("lister");
  if (!lister) throw new Error("lister required");
  const rows = await db.select().from(yieldLedger).where(eq(yieldLedger.lister, lister)).orderBy(desc(yieldLedger.createdAt));
  const byPack: Record<string, { unpaid: number; paid: number; events: number }> = {};
  for (const r of rows) {
    const p = (byPack[r.packId] ??= { unpaid: 0, paid: 0, events: 0 });
    p.events++; if (r.payoutId) p.paid += r.amountLamports; else p.unpaid += r.amountLamports;
  }
  const paid = await db.select().from(payouts).where(eq(payouts.lister, lister)).orderBy(desc(payouts.createdAt));
  const events = [...rows].reverse().map((r) => ({ t: r.createdAt, packId: r.packId, amount: r.amountLamports }));
  return { events, byPack, unpaid: rows.filter((r) => !r.payoutId).reduce((s, r) => s + r.amountLamports, 0), recent: rows.slice(0, 20), payouts: paid };
});
