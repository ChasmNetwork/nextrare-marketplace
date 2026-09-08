// ponytail: packs are static bands, not a table
export const PACKS = [
  { slug: "budget", name: "Budget Pack", minAsk: 0, maxAsk: 0.03e9 },
  { slug: "mid", name: "Mid Pack", minAsk: 0.03e9, maxAsk: 0.1e9 },
  { slug: "chase", name: "Chase Pack", minAsk: 0.1e9, maxAsk: Number.MAX_SAFE_INTEGER },
] as const;
export type PackSlug = (typeof PACKS)[number]["slug"];
export const packFor = (askLamports: number): PackSlug =>
  PACKS.find((p) => askLamports >= p.minAsk && askLamports < p.maxAsk)!.slug;
export const packBySlug = (slug: string) => PACKS.find((p) => p.slug === slug);
