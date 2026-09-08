"use client";
import { MonoCard } from "./mono";
import { LedBars } from "./led";

type Row = { name: string; prob: number; askLamports: number };
/** LED bars: your odds per card, cheapest first. */
export function OddsChart({ cards, live }: { cards: Row[]; live?: number | null }) {
  const rows = cards.map((c) => ({ label: c.name.replace(/ · PSA.*$/, ""), v: +(c.prob * 100).toFixed(1), sub: (c.askLamports / 1e9).toFixed(3) }));
  const top = rows[0];
  return (
    <MonoCard live={live} label="Your odds" badge="cheaper = likelier" value={top ? `${top.v}%` : "—"} unit={top ? `most likely · ${top.label}` : ""}
      footerL={`${rows.length} cards in this pack`} footerR="price sets the odds">
      <LedBars rows={rows} />
    </MonoCard>
  );
}
