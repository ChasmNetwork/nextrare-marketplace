import { and, eq, inArray, isNull } from "drizzle-orm";
import { db, yieldLedger, payouts } from "@/db";
import { handle, body, uid, now } from "@/lib/route";
import { payBatch } from "@/lib/solana/core";

/**
 * Month-end payout: sum unpaid ledger per seller, one transfer each.
 * `lister` scopes it to one wallet — the in-app Withdraw button must never sweep everybody else's balance.
 */
export const POST = handle(async (req) => {
  if (req.headers.get("x-admin-key") !== (process.env.ADMIN_KEY ?? "dev")) throw new Error("unauthorized");
  const { lister } = await body<{ lister?: string }>(req).catch(() => ({ lister: undefined as string | undefined }));
  const rows = await db.select().from(yieldLedger)
    .where(lister ? and(isNull(yieldLedger.payoutId), eq(yieldLedger.lister, lister)) : isNull(yieldLedger.payoutId));
  if (!rows.length) return { paid: [] };
  const perLister = new Map<string, { lamports: number; ids: string[] }>();
  for (const r of rows) { const e = perLister.get(r.lister) ?? { lamports: 0, ids: [] }; e.lamports += r.amountLamports; e.ids.push(r.id); perLister.set(r.lister, e); }
  const items = [...perLister].map(([to, e]) => ({ to, lamports: e.lamports }));
  const sigs = await payBatch(items);
  const period = new Date().toISOString().slice(0, 7);
  const out = [];
  for (const [i, [lister, e]] of [...perLister].entries()) {
    const id = uid(); const sig = sigs[Math.floor(i / 20)];
    await db.insert(payouts).values({ id, period, lister, amountLamports: e.lamports, sig, createdAt: now() });
    await db.update(yieldLedger).set({ payoutId: id }).where(inArray(yieldLedger.id, e.ids));
    out.push({ lister, lamports: e.lamports, sig });
  }
  return { paid: out };
});
