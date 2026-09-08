export const SELLBACK_RATE = 0.85;
export const LISTER_YIELD_SHARE = 0.5;
export const DECISION_MS = 600_000;
export const MIN_PACK_CARDS = 3;

export type Card = { id: string; ask: number; lister?: string };

/** weight ∝ 1/ask → cheaper cards more likely. price = EV (no surcharge). */
export function odds(cards: Card[]) {
  const weights = cards.map((c) => 1 / c.ask);
  const total = weights.reduce((a, b) => a + b, 0);
  const probs = weights.map((w) => w / total);
  const ev = Math.round(cards.reduce((s, c, i) => s + probs[i] * c.ask, 0));
  return { probs, ev, price: ev };
}

/** roll: uniform u64 as bigint. Deterministic given (roll, cards order). */
export function pickWinner(roll: bigint, cards: Card[]): number {
  const { probs } = odds(cards);
  const r = Number(roll % BigInt(1e12)) / 1e12; // [0,1)
  let acc = 0;
  for (let i = 0; i < probs.length; i++) {
    acc += probs[i];
    if (r < acc) return i;
  }
  return probs.length - 1;
}

/** Sellback of card `won`: buyer gets 85% of ask; 15% spread → half to pack pool (pro-rata by ask), half platform. */
export function sellbackSplit(won: Card, active: Card[]) {
  const buyerPayout = Math.floor(won.ask * SELLBACK_RATE);
  const spread = won.ask - buyerPayout;
  const pool = Math.floor(spread * LISTER_YIELD_SHARE);
  const totalAsk = active.reduce((s, c) => s + c.ask, 0);
  let distributed = 0;
  const shares = active.map((c) => {
    const bps = Math.round((c.ask / totalAsk) * 10_000);
    const amount = Math.floor((pool * c.ask) / totalAsk);
    distributed += amount;
    return { id: c.id, lister: c.lister, bps, amount };
  });
  return { buyerPayout, spread, pool, platform: spread - distributed, shares };
}

// ponytail: self-check. run: pnpm tsx lib/pack-math.ts
if (process.argv[1]?.endsWith("pack-math.ts")) {
  const assert = (c: unknown, m: string) => { if (!c) throw new Error(m); };
  const cards: Card[] = [{ id: "a", ask: 1e9, lister: "L1" }, { id: "b", ask: 2e9, lister: "L2" }, { id: "c", ask: 4e9, lister: "L3" }];
  const o = odds(cards);
  assert(Math.abs(o.probs.reduce((a, b) => a + b, 0) - 1) < 1e-9, "probs sum 1");
  assert(o.probs[0] > o.probs[2], "cheaper more likely");
  assert(Math.abs(o.ev - 3 / (1 / 1e9 + 1 / 2e9 + 1 / 4e9)) < 1, "ev = harmonic mean");
  assert(pickWinner(BigInt(0), cards) === 0 && pickWinner(BigInt(999_999_999_999), cards) === 2, "pick edges");
  const s = sellbackSplit(cards[1], cards);
  assert(s.buyerPayout === 1.7e9, "85% payout");
  assert(s.shares.reduce((a, x) => a + x.amount, 0) + s.platform === s.spread, "spread conserved");
  assert(s.shares.reduce((a, x) => a + x.amount, 0) <= s.pool, "pool not overspent");
  assert(s.shares[2].amount > s.shares[0].amount, "pro-rata by ask");
  console.log("pack-math OK", { ev: o.ev, split: s });
}
