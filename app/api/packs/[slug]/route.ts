import { eq, desc } from "drizzle-orm";
import { db, pulls, yieldLedger } from "@/db";
import { handle, type P } from "@/lib/route";
import { packBySlug } from "@/lib/packs";
import { activeInPack, toCards } from "@/lib/queries";
import { odds, MIN_PACK_CARDS } from "@/lib/pack-math";

export const GET = handle(async (_req, { params }: P<{ slug: string }>) => {
  const { slug } = await params;
  const pack = packBySlug(slug);
  if (!pack) throw new Error("no such pack");
  const [rows, ps, ys] = await Promise.all([
    activeInPack(slug),
    db.select().from(pulls).where(eq(pulls.packId, slug)).orderBy(desc(pulls.createdAt)),
    db.select().from(yieldLedger).where(eq(yieldLedger.packId, slug)),
  ]);
  const o = rows.length ? odds(toCards(rows)) : { probs: [], ev: 0, price: 0 };
  const poolByPull: Record<string, number> = {};
  for (const y of ys) poolByPull[y.pullId] = (poolByPull[y.pullId] ?? 0) + y.amountLamports;
  const settled = ps.filter((x) => x.status === "kept" || x.status === "sold_back");
  const stats = { pulls: settled.length, kept: settled.filter((x) => x.status === "kept").length, soldBack: settled.filter((x) => x.status === "sold_back").length,
    volume: settled.reduce((a, x) => a + x.priceLamports, 0), pool: ys.reduce((a, y) => a + y.amountLamports, 0), totalAsk: rows.reduce((a, r) => a + r.askLamports, 0) };
  const activity = settled.map((x) => ({ t: x.createdAt, status: x.status, price: x.priceLamports, pool: poolByPull[x.id] ?? 0 })).reverse();
  return { pack, price: o.price, open: rows.length >= MIN_PACK_CARDS, cards: rows.map((r, i) => ({ ...r, prob: o.probs[i] })), stats, activity };
});
