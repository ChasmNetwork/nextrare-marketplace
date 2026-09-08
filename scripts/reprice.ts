// pnpm tsx --env-file=.env.local scripts/reprice.ts [divisor=10]
// Scales every ACTIVE listing's ask down (devnet SOL is scarce, so demo packs must be cheap) and re-buckets
// it into the right pack. Asks live only in the DB — nothing onchain depends on them.
import { eq } from "drizzle-orm";
import { db, listings } from "../db";
import { packFor } from "../lib/packs";

async function main() {
  const div = Number(process.argv[2] ?? 10);
  const rows = await db.select().from(listings).where(eq(listings.status, "active"));
  for (const l of rows) {
    const ask = Math.max(1_000_000, Math.round(l.askLamports / div)); // floor 0.001 SOL
    await db.update(listings).set({ askLamports: ask, packId: packFor(ask) }).where(eq(listings.id, l.id));
    console.log(l.name, (l.askLamports / 1e9).toFixed(3), "→", (ask / 1e9).toFixed(3), packFor(ask));
  }
  console.log(rows.length, "listings repriced");
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
