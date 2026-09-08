import { PublicKey, SystemProgram } from "@solana/web3.js";
import { db, pulls } from "@/db";
import { handle, body, uid, now, type P } from "@/lib/route";
import { packBySlug } from "@/lib/packs";
import { activeInPack, toCards } from "@/lib/queries";
import { odds, MIN_PACK_CARDS } from "@/lib/pack-math";
import { commit, memoIx, provider } from "@/lib/solana/randomness";
import { buildTx } from "@/lib/solana/tx";
import { platformKp } from "@/lib/solana/umi";

/** Buyer pays EV to the vault; our randomness commitment rides in the same tx as a Memo. */
export const POST = handle(async (req, { params }: P<{ slug: string }>) => {
  const { slug } = await params;
  const { buyer } = await body<{ buyer: string }>(req);
  if (!packBySlug(slug)) throw new Error("no such pack");
  const rows = await activeInPack(slug);
  if (rows.length < MIN_PACK_CARDS) throw new Error(`pack needs ${MIN_PACK_CARDS}+ cards`);
  const cards = toCards(rows);
  const { price } = odds(cards);
  const id = uid();
  const c = commit();
  const b = new PublicKey(buyer);
  const built = await buildTx(b, [SystemProgram.transfer({ fromPubkey: b, toPubkey: platformKp.publicKey, lamports: price }), memoIx(id, c.hash)]);
  await db.insert(pulls).values({
    id, packId: slug, buyer, priceLamports: price, snapshot: JSON.stringify(cards), messageHash: built.messageHash,
    commitHash: c.hash, revealSecret: c.secret, blockhash: built.blockhash, lastValidBlockHeight: built.lastValidBlockHeight, provider, status: "built", createdAt: now(),
  });
  return { pullId: id, price, commitHash: c.hash, tx: built.tx };
});
