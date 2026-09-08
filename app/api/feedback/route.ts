import { desc } from "drizzle-orm";
import { db, feedback } from "@/db";
import { handle, body, uid, now } from "@/lib/route";

export const GET = handle(async () => {
  const rows = await db.select().from(feedback).orderBy(desc(feedback.createdAt)).limit(50);
  return { rows, count: rows.length, avg: rows.length ? rows.reduce((a, r) => a + r.score, 0) / rows.length : 0 };
});

export const POST = handle(async (req) => {
  const { wallet, score, role, note, ref } = await body<{ wallet?: string; score: number; role?: string; note?: string; ref?: string }>(req);
  const s = Math.round(Number(score));
  if (!(s >= 1 && s <= 5)) throw new Error("score must be 1-5");
  await db.insert(feedback).values({
    id: uid(), wallet: wallet ?? null, score: s,
    role: role?.slice(0, 16) ?? null, note: note?.trim().slice(0, 600) || null, ref: ref?.slice(0, 32) ?? null,
    createdAt: now(),
  });
  return { ok: true };
});
