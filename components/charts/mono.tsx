"use client";
// Amicro "Mono Charts" chrome + tooltip (light theme), adapted: brand ink + glass card.
import type { ReactNode } from "react";
import { Live } from "@/components/live";

export const INK = "var(--nr-ink)";
export const RED = "var(--nr)";
export const TICK = { fontSize: 10, fill: "#A1A1AA" } as const;
export const GRID = { strokeDasharray: "2 2", vertical: false, stroke: "rgba(0,0,0,.06)" } as const;
export const AXIS = { tickLine: false, axisLine: false } as const;

export function MonoCard({ label, badge, value, unit, sub, action, footerL, footerR, live, children, className = "" }: {
  label: string; badge?: string; value?: ReactNode; unit?: string; sub?: string; action?: ReactNode; footerL?: string; footerR?: string; live?: number | null; children: ReactNode; className?: string;
}) {
  return (
    <div className={`glass glass-strong group relative flex flex-col justify-between overflow-hidden rounded-[20px] p-3 transition-all duration-300 sm:p-4 ${className}`}>
      <div className="mb-1.5 flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-xs font-bold uppercase tracking-wider text-neutral-700">{label}</span>
            {badge && <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-[var(--nr)]/25 bg-[var(--nr)]/10 px-1.5 py-0.5 font-mono text-[10px] text-nr">{badge}</span>}
          </div>
          {value !== undefined && <div className="mt-0.5 truncate text-xl font-bold tabular-nums tracking-tight">{value} {unit && <span className="text-xs font-normal opacity-70">{unit}</span>}</div>}
          {sub && <div className="truncate text-xs text-neutral-600" title={sub}>{sub}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-2">{live !== undefined && <Live at={live} />}{action}</div>
      </div>
      <div className="relative w-full overflow-hidden rounded-[14px] bg-[#f4f4f6]/80 p-2 touch-pan-y">{children}</div>
      {(footerL || footerR) && (
        <div className="mt-2 flex items-center justify-between border-t border-black/5 pt-1 font-mono text-[11px]">
          <span className="text-neutral-600">{footerL}</span><span className="font-medium text-black">{footerR}</span>
        </div>
      )}
    </div>
  );
}

/** Segmented toggle in the Amicro style. */
export function Seg<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-neutral-200 bg-neutral-100 p-0.5">
      {options.map((o) => <button key={o} type="button" onClick={() => onChange(o)} className={`inline-flex min-h-[30px] cursor-pointer items-center rounded-full px-3 py-1 text-[11px] font-medium capitalize transition-all ${value === o ? "bg-black font-semibold text-white shadow-sm" : "text-neutral-600 hover:text-black"}`}>{o}</button>)}
    </div>
  );
}

type Item = { name?: string; dataKey?: string | number; value?: number | string; color?: string; fill?: string; payload?: Record<string, unknown> };
export function MonoTooltip({ active, payload, label, formatter, labelFormatter }: {
  active?: boolean; payload?: Item[]; label?: string | number; formatter?: (v: number | string, name: string, item: Item) => ReactNode; labelFormatter?: (label: string | number | undefined, payload: Item[]) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  const l = labelFormatter ? labelFormatter(label, payload) : label;
  return (
    <div className="pointer-events-none z-50 rounded-xl border border-neutral-200 bg-white/95 px-3 py-2 text-xs text-neutral-900 shadow-2xl shadow-neutral-300/50 backdrop-blur-md">
      {l !== undefined && l !== "" && <div className="mb-1.5 border-b border-neutral-200 pb-1 font-medium tracking-tight text-neutral-600">{l}</div>}
      <div className="flex flex-col gap-1">
        {payload.map((it, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full ring-1 ring-black/10" style={{ background: it.color ?? it.fill ?? "#000" }} /><span className="text-neutral-600">{String(it.name ?? it.dataKey)}</span></div>
            <span className="font-semibold tabular-nums">{formatter ? formatter(it.value ?? "", String(it.name ?? it.dataKey), it) : typeof it.value === "number" ? it.value.toLocaleString() : it.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
