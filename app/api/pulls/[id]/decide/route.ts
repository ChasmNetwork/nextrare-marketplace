import { eq } from "drizzle-orm";
import { db, pulls } from "@/db";
import { handle, body, type P } from "@/lib/route";
import { settle } from "@/lib/settle";

export const POST = handle(async (req, { params }: P<{ id: string }>) => {
  const { id } = await params;
  const { choice, buyer } = await body<{ choice: "keep" | "sellback"; buyer: string }>(req);
  const pull = await db.query.pulls.findFirst({ where: eq(pulls.id, id) });
  if (!pull || pull.buyer !== buyer) throw new Error("not your pull"); // ponytail: pubkey match, no sig
  return settle(id, choice);
});
