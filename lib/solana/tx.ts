// server only
import { ComputeBudgetProgram, Keypair, PublicKey, SystemInstruction, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { createHash } from "node:crypto";
import { conn } from "./connection";
import { platformKp } from "./umi";

const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

/** Build v0 tx for `payer` (browser wallet). Optionally partial-sign with server keypairs. */
export async function buildTx(payer: PublicKey, ixs: TransactionInstruction[], signers: Keypair[] = []) {
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  const tx = new VersionedTransaction(
    new TransactionMessage({ payerKey: payer, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message(),
  );
  if (signers.length) tx.sign(signers);
  const sim = await conn.simulateTransaction(tx, { sigVerify: false });
  if (sim.value.err) throw new Error(`simulate failed: ${JSON.stringify(sim.value.err)}\n${(sim.value.logs ?? []).join("\n")}`);
  return { tx: Buffer.from(tx.serialize()).toString("base64"), blockhash, lastValidBlockHeight, messageHash: sha(tx.message.serialize()) };
}

/** What the tx must do, whatever else the wallet decorated it with. */
export type Intent = {
  payer?: string;
  /** exact lamport transfers that must be present (one compiled System transfer each) */
  transfers?: { to: string; lamports: number }[];
  /** exact Memo payload that must be present */
  memo?: string;
  /** program ids allowed beyond System/Memo/ComputeBudget (e.g. mpl-core on a buy) */
  allowPrograms?: string[];
};

const MEMO = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const BASE_OK = [SystemProgram.programId.toBase58(), ComputeBudgetProgram.programId.toBase58(), MEMO];

/**
 * Wallets are allowed to decorate a tx they sign — Phantom adds a priority-fee (ComputeBudget) instruction and
 * may refresh the blockhash — so byte equality is the wrong check ("tx message mismatch"). Verify INTENT instead:
 * the fee payer, the exact SOL movements, our commitment memo, and that no unexpected program is invoked.
 * Server-signed instructions (mpl-core on a buy) need no byte check: editing them invalidates the platform
 * signature and the chain rejects the tx.
 */
export function verifyIntent(tx: VersionedTransaction, want: Intent) {
  if (tx.message.addressTableLookups.length) throw new Error("address lookup tables are not accepted");
  const msg = TransactionMessage.decompile(tx.message);
  if (want.payer && msg.payerKey.toBase58() !== want.payer) throw new Error("wrong fee payer");
  const ok = new Set([...BASE_OK, ...(want.allowPrograms ?? [])]);
  for (const ix of msg.instructions) if (!ok.has(ix.programId.toBase58())) throw new Error(`unexpected program ${ix.programId.toBase58()}`);
  for (const t of want.transfers ?? []) {
    const found = msg.instructions.some((ix) => {
      if (!ix.programId.equals(SystemProgram.programId)) return false;
      try {
        const d = SystemInstruction.decodeTransfer(ix);
        return d.toPubkey.toBase58() === t.to && Number(d.lamports) === t.lamports;
      } catch { return false; }
    });
    if (!found) throw new Error(`missing payment of ${(t.lamports / 1e9).toFixed(4)} SOL`);
  }
  if (want.memo) {
    const hit = msg.instructions.some((ix) => ix.programId.toBase58() === MEMO && Buffer.from(ix.data).toString() === want.memo);
    if (!hit) throw new Error("randomness commitment missing from tx");
  }
  return msg.recentBlockhash;
}

/** Client returns the wallet-signed tx; verify it still does what we built it to do, then send + confirm. */
export async function submitSigned(signedB64: string, expected: { messageHash: string; blockhash: string; lastValidBlockHeight: number; intent?: Intent }) {
  const tx = VersionedTransaction.deserialize(Buffer.from(signedB64, "base64"));
  const same = sha(tx.message.serialize()) === expected.messageHash;
  const blockhash = same ? expected.blockhash : verifyIntent(tx, expected.intent ?? {});
  // a refreshed blockhash needs its own expiry height; the built one keeps the height we stored
  const lastValidBlockHeight = blockhash === expected.blockhash ? expected.lastValidBlockHeight : (await conn.getLatestBlockhash("confirmed")).lastValidBlockHeight;
  const signature = await conn.sendRawTransaction(tx.serialize());
  await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
  return signature;
}

/** Fully server-signed tx (payer = platform). */
export async function sendServer(ixs: TransactionInstruction[]) {
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  const tx = new VersionedTransaction(
    new TransactionMessage({ payerKey: platformKp.publicKey, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message(),
  );
  tx.sign([platformKp]);
  const signature = await conn.sendRawTransaction(tx.serialize());
  await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
  return signature;
}
