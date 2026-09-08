"use client";
import { useState } from "react";
import { MonoCard, Seg } from "./mono";
import { LiveTape } from "./led";

type Ev = { t: number; pool: number; status: string; price: number };
const WIN = { "4m": 240_000, "1h": 3_600_000, "24h": 86_400_000 } as const;

/** LED tape of cumulative SOL paid to sellers. Right edge is always now, so it slides live. */
export function PoolChart({ activity, label = "Rent paid to sellers", sub, live }: { activity: Ev[]; label?: string; sub?: string; live?: number | null }) {
  const [span, setSpan] = useState<keyof typeof WIN>("1h");
  const points = activity.reduce<{ t: number; v: number }[]>((acc, a) => [...acc, { t: a.t, v: +(((acc.at(-1)?.v ?? 0) * 1e9 + a.pool) / 1e9).toFixed(5) }], []);
  const total = points.at(-1)?.v ?? 0;
  const sellbacks = activity.filter((a) => a.status === "sold_back").length;
  return (
    <MonoCard live={live} label={label} badge="from cash-outs" value={total.toFixed(3)} unit="SOL to sellers" sub={sub}
      action={<Seg value={span} options={["4m", "1h", "24h"] as const} onChange={setSpan} />}
      footerL={`${sellbacks} cash-outs · ${activity.length - sellbacks} kept`} footerR="live · grows on every cash-out">
      {!points.length ? <p className="py-10 text-center text-sm text-zinc-600">No rips yet. First cash-out starts paying sellers.</p>
        : <LiveTape series={[{ key: "pool", color: "#dd2023", points }]} windowMs={WIN[span]} height={160} />}
    </MonoCard>
  );
}
