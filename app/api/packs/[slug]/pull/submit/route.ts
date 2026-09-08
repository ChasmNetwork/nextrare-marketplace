import { eq } from "drizzle-orm";
import { db, listings, pulls } from "@/db";
import { handle, body, now } from "@/lib/route";
import { activeInPack } from "@/lib/queries";
import { pickWinner, DECISION_MS, type Card } from "@/lib/pack-math";
import { reveal } from "@/lib/solana/randomness";
import { submitSigned } from "@/lib/solana/tx";
import { platformKp } from "@/lib/solana/umi";

export const POST = handle(async (req) => {
  const { pullId, signed } = await body<{ pullId: string; signed: string }>(req);
  const pull = await db.query.pulls.findFirst({ where: eq(pulls.id, pullId) });
  if (!pull || pull.status !== "built") throw new Error("no pending pull");
  let paymentSig: string;
  try {
    paymentSig = await submitSigned(signed, {
      messageHash: pull.messageHash!, blockhash: pull.blockhash!, lastValidBlockHeight: pull.lastValidBlockHeight!,
      intent: { payer: pull.buyer, transfers: [{ to: platformKp.publicKey.toBase58(), lamports: pull.priceLamports }], memo: `nr:${pull.id}:${pull.commitHash}` },
    });
  } catch (e) { await db.update(pulls).set({ status: "failed" }).where(eq(pulls.id, pullId)); throw e; }
  const { blockhash, roll } = await reveal(pull.revealSecret, paymentSig);
  // cards bought between build and pay drop out; the final set is stored so the roll stays reproducible
  const stillActive = new Set((await activeInPack(pull.packId)).map((r) => r.id));
  const snap = (JSON.parse(pull.snapshot) as Card[]).filter((c) => stillActive.has(c.id));
  if (!snap.length) throw new Error("pack emptied mid-pull"); // ponytail: refund path not built
  const won = snap[pickWinner(roll, snap)];
  await db.update(listings).set({ status: "reserved" }).where(eq(listings.id, won.id));
  await db.update(pulls).set({ paymentSig, blockhash, roll: roll.toString(), wonListingId: won.id, snapshot: JSON.stringify(snap), status: "revealed", decisionDeadline: now() + DECISION_MS }).where(eq(pulls.id, pullId));
  return { pullId, paymentSig, roll: roll.toString(), wonListingId: won.id };
});
