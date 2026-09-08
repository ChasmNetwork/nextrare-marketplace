import { desc } from "drizzle-orm";
import { db, listings, pulls, payouts } from "@/db";
import { handle } from "@/lib/route";

export type Ev = { t: number; kind: "listed" | "sold" | "pulled" | "kept" | "sold_back" | "payout" | "delisted"; who: string; name?: string; lamports?: number; sig?: string | null; packId?: string; imageUri?: string; ask?: number };

/** Last 30 protocol events for the live feed. ponytail: derived from row timestamps; a real event table comes later. */
export const GET = handle(async () => {
  const [ls, ps, po] = await Promise.all([
    db.select().from(listings).orderBy(desc(listings.createdAt)).limit(40),
    db.select().from(pulls).orderBy(desc(pulls.createdAt)).limit(40),
    db.select().from(payouts).orderBy(desc(payouts.createdAt)).limit(20),
  ]);
  const byId = new Map(ls.map((l) => [l.id, l]));
  const ev: Ev[] = [];
  for (const l of ls) {
    ev.push({ t: l.createdAt, kind: "listed", who: l.lister, name: l.name, lamports: l.askLamports, sig: l.listSig, packId: l.packId });
    if (l.status === "sold" && l.buyer) ev.push({ t: l.createdAt + 1, kind: "sold", who: l.buyer, name: l.name, lamports: l.askLamports, sig: l.soldSig, packId: l.packId });
    if (l.status === "delisted") ev.push({ t: l.createdAt + 1, kind: "delisted", who: l.lister, name: l.name, sig: l.soldSig, packId: l.packId });
  }
  for (const p of ps) {
    if (p.status === "built" || p.status === "failed") continue;
    const won = p.wonListingId ? byId.get(p.wonListingId) : undefined;
    ev.push({ t: p.createdAt, kind: "pulled", who: p.buyer, name: won?.name, lamports: p.priceLamports, sig: p.paymentSig, packId: p.packId, imageUri: won?.imageUri, ask: won?.askLamports });
    if (p.status === "kept" || p.status === "sold_back") ev.push({ t: p.createdAt + 2, kind: p.status, who: p.buyer, name: won?.name, lamports: p.status === "kept" ? won?.askLamports : Math.floor((won?.askLamports ?? 0) * 0.85), sig: p.settleSig, packId: p.packId, imageUri: won?.imageUri, ask: won?.askLamports });
  }
  for (const x of po) ev.push({ t: x.createdAt, kind: "payout", who: x.lister, lamports: x.amountLamports, sig: x.sig });
  return ev.sort((a, b) => b.t - a.t).slice(0, 30);
});
