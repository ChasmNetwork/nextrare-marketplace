"use client";
import NumberFlow from "@number-flow/react";
import { LedMeter } from "@/components/charts/led";

/** Hero number with digit-flow animation. value in SOL (float). */
export function Stat({ label, sol, usd, hint, accent, plain, suffix, meter }: { label: string; sol: number; usd?: number | null; hint?: string; accent?: string; plain?: boolean; suffix?: string; meter?: number }) {
  return (
    <div className="glass glass-strong led-surface min-w-0 p-3">
      <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-zinc-600" title={label}>{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1 font-mono text-2xl font-semibold tabular-nums" style={{ color: accent ?? "#111827" }}>
        <NumberFlow value={sol} format={plain ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 3, maximumFractionDigits: 3 }} /><span className="text-sm font-medium text-zinc-500">{suffix ?? (plain ? "" : "SOL")}</span>
      </div>
      {meter != null && <div className="mt-1.5"><LedMeter value={meter} color={accent ?? "#18181b"} height={8} label={label} /></div>}
      {usd != null && <div className="whitespace-nowrap font-mono text-sm tabular-nums text-zinc-600">≈ $<NumberFlow value={usd} format={{ maximumFractionDigits: 2 }} /></div>}
      {hint && <div className="mt-1 truncate text-xs text-zinc-600" title={hint}>{hint}</div>}
    </div>
  );
}
