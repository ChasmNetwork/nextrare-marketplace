import { desc } from "drizzle-orm";
import { db, waitlist } from "@/db";
import { handle, body, uid, now } from "@/lib/route";

/** Public wall shows enough to be credible, not enough to spam. */
const mask = (c: string) => {
  const at = c.lastIndexOf("@");
  return at > 0 ? `${c.slice(0, 2)}***${c.slice(at)}` : `${c.slice(0, 3)}***`;
};

export const GET = handle(async () => {
  const rows = await db.select().from(waitlist).orderBy(desc(waitlist.createdAt)).limit(100);
  return { count: rows.length, rows: rows.map((r) => ({ ...r, contact: mask(r.contact) })) };
});

export const POST = handle(async (req) => {
  const { contact, role, note, ref } = await body<{ contact: string; role?: string; note?: string; ref?: string }>(req);
  const c = contact?.trim().slice(0, 120);
  // ponytail: one shape check, no email verification — a hackathon waitlist does not need a mail loop
  if (!c || c.length < 4 || /\s/.test(c)) throw new Error("Enter an email or @handle");
  await db.insert(waitlist).values({ id: uid(), contact: c, role: role?.slice(0, 16) ?? null, note: note?.trim().slice(0, 600) || null, ref: ref?.slice(0, 32) ?? null, createdAt: now() });
  return { ok: true };
});
