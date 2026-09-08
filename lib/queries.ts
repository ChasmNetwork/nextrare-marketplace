import { and, eq, isNull } from "drizzle-orm";
import { db, listings } from "@/db";
import type { Card } from "./pack-math";

export const activeInPack = (packId: string) =>
  db.select().from(listings).where(and(eq(listings.status, "active"), eq(listings.packId, packId)));
export const toCards = (rows: { id: string; askLamports: number; lister: string }[]): Card[] =>
  rows.map((r) => ({ id: r.id, ask: r.askLamports, lister: r.lister }));
export const listingById = (id: string) => db.query.listings.findFirst({ where: eq(listings.id, id) });
export { isNull };
