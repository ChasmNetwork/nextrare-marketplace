import { PublicKey } from "@solana/web3.js";
import { conn } from "@/lib/solana/connection";
import { handle } from "@/lib/route";

/** Devnet balance for a wallet, so the UI can tell a mainnet-mode Phantom apart from an empty wallet. */
export const GET = handle(async (req) => {
  const w = new URL(req.url).searchParams.get("wallet");
  if (!w) throw new Error("wallet required");
  return { lamports: await conn.getBalance(new PublicKey(w)) };
});
export const runtime = "nodejs";
