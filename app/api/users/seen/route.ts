import { sql } from "drizzle-orm";
import { db, users } from "@/db";
import { handle, body, now } from "@/lib/route";

/** Called once per wallet connect. Upsert so `users` = every wallet that ever showed up, transacting or not. */
export const POST = handle(async (req) => {
  const { wallet, ref } = await body<{ wallet: string; ref?: string }>(req);
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) throw new Error("bad wallet");
  const t = now();
  await db.insert(users).values({ wallet, ref: ref?.slice(0, 32) ?? null, firstSeen: t, lastSeen: t, visits: 1 })
    .onConflictDoUpdate({ target: users.wallet, set: { lastSeen: t, visits: sql`${users.visits} + 1`, ref: sql`coalesce(${users.ref}, ${ref?.slice(0, 32) ?? null})` } });
  return { ok: true };
});
