"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useJson } from "@/components/ui";
import { sol, addr } from "@/lib/client";

/**
 * Devnet balance read from OUR rpc, not the wallet. Phantom shows mainnet numbers unless Testnet Mode
 * is on, which is the #1 way a first-time judge gets stuck ("insufficient funds" on a funded wallet).
 */
export function NetChip() {
  const { publicKey } = useWallet();
  const me = publicKey?.toBase58() ?? null;
  const { data } = useJson<{ lamports: number }>(me ? `/api/balance?wallet=${me}` : null, [], 15000);
  if (!me) return <span className="glass glass-pill px-3 py-1.5 font-mono text-[11px] font-medium text-zinc-700">Solana devnet</span>;
  return (
    <a href={addr(me)} target="_blank" title="your devnet balance, read from the chain" className="glass glass-pill glass-interactive inline-flex items-center gap-2 px-3 py-1.5 font-mono text-[11px] font-semibold text-zinc-800">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />devnet · {data ? sol(data.lamports) : "…"}
    </a>
  );
}
