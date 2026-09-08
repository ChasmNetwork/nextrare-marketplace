import { handle } from "@/lib/route";
// ponytail: CoinGecko, 60s cache; Jupiter fallback. USD is display-only, settlement is SOL.
export const GET = handle(async () => {
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", { next: { revalidate: 60 } });
    const j = await r.json(); if (j?.solana?.usd) return { usd: j.solana.usd };
  } catch {}
  const r = await fetch("https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112", { next: { revalidate: 60 } });
  const j = await r.json();
  return { usd: Number(j?.So11111111111111111111111111111111111111112?.usdPrice ?? 0) };
});
