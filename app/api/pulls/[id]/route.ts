import { eq } from "drizzle-orm";
import { db, pulls } from "@/db";
import { handle, now, type P } from "@/lib/route";
import { listingById } from "@/lib/queries";
import { settle } from "@/lib/settle";

export const GET = handle(async (_req, { params }: P<{ id: string }>) => {
  const { id } = await params;
  let pull = await db.query.pulls.findFirst({ where: eq(pulls.id, id) });
  if (!pull) throw new Error("not found");
  if (pull.status === "revealed" && (pull.decisionDeadline ?? 0) < now()) { // ponytail: lazy expiry → force keep
    await settle(id, "keep");
    pull = (await db.query.pulls.findFirst({ where: eq(pulls.id, id) }))!;
  }
  const won = pull.wonListingId ? await listingById(pull.wonListingId) : null;
  const { revealSecret, ...safe } = pull;
  return { ...safe, revealSecret: pull.status === "built" ? undefined : revealSecret, won };
});
