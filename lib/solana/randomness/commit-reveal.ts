import { createHash, randomBytes } from "node:crypto";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { conn } from "../connection";

export const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const sha = (...parts: (string | Buffer)[]) => { const h = createHash("sha256"); parts.forEach((p) => h.update(p)); return h.digest(); };

/** 1. Server commits before seeing the buyer's signature. */
export function commit() {
  const secret = randomBytes(32).toString("hex");
  return { secret, hash: sha(Buffer.from(secret, "hex")).toString("hex") };
}
/** 2. Commit rides inside the buyer's payment tx. */
export const memoIx = (pullId: string, hash: string) =>
  new TransactionInstruction({ programId: MEMO_PROGRAM, keys: [], data: Buffer.from(`nr:${pullId}:${hash}`) });

/** Pure: anyone can recompute. roll = sha256(secret ‖ blockhash ‖ paymentSig) as u64 LE. */
export const computeRoll = (secretHex: string, blockhash: string, paymentSig: string) =>
  sha(Buffer.from(secretHex, "hex"), blockhash, paymentSig).readBigUInt64LE(0);

/** 3. After payment confirms: reveal. Buyer's ed25519 sig is unpredictable to server; server hash is committed before sig exists. */
export async function reveal(secretHex: string, paymentSig: string) {
  const ptx = await conn.getTransaction(paymentSig, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
  if (!ptx) throw new Error("payment tx not found");
  const blockhash = ptx.transaction.message.recentBlockhash;
  return { blockhash, roll: computeRoll(secretHex, blockhash, paymentSig) };
}
