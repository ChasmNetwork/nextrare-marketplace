"use client";
import { useEffect, useState, useCallback } from "react";
import { api, sol } from "@/lib/client";

/** Fetch JSON; `every` ms → poll (realtime-ish) + refetch on tab focus. `at` = last successful fetch. */
export function useJson<T>(url: string | null, deps: unknown[] = [], every?: number) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [at, setAt] = useState<number | null>(null);
  const reload = useCallback(() => { if (!url) return; api<T>(url).then((d) => { setData(d); setAt(Date.now()); setErr(null); }).catch((e) => setErr(e.message)); }, [url]);
  useEffect(reload, [reload, ...deps]);
  useEffect(() => {
    if (!every || !url) return;
    const id = setInterval(() => { if (document.visibilityState === "visible") reload(); }, every);
    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, [every, url, reload]);
  return { data, err, reload, at };
}

/** labels stay on one line and clip with an ellipsis — a price in the label must never grow the control */
const CTA = "glass-interactive inline-flex h-9 max-w-full items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold leading-none disabled:opacity-40";
export function Btn({ busy, className = "", children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return <button {...p} disabled={p.disabled || busy} title={typeof children === "string" ? children : undefined} className={`glass-prominent ${CTA} ${className}`}><span className="min-w-0 truncate">{busy ? "…" : children}</span></button>;
}
export function Ghost({ className = "", children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p} title={typeof children === "string" ? children : undefined} className={`glass ${CTA} text-zinc-900 ${className}`}><span className="min-w-0 truncate">{children}</span></button>;
}
/** status/pack badges: dark ink on a light tint, own border — reads at a glance, distinct per meaning. */
export const BADGE: Record<string, string> = {
  active: "border-emerald-600/40 bg-emerald-100 text-emerald-900",
  sold: "border-zinc-700/40 bg-zinc-200 text-zinc-900",
  pulled: "border-violet-600/40 bg-violet-100 text-violet-900",
  reserved: "border-amber-600/40 bg-amber-100 text-amber-900",
  pending_buy: "border-amber-600/40 bg-amber-100 text-amber-900",
  delisted: "border-zinc-500/40 bg-zinc-100 text-zinc-700",
  budget: "border-[#2a78d6]/45 bg-[#2a78d6]/15 text-[#12457f]",
  mid: "border-[#eb6834]/45 bg-[#eb6834]/15 text-[#8a3312]",
  chase: "border-[#1baf7a]/45 bg-[#1baf7a]/18 text-[#0b5c40]",
  default: "border-[var(--nr)]/40 bg-[var(--nr)]/12 text-[#8f1416]",
};
export function Card({ img, name, children, badge, href }: { img: string; name: string; badge?: string; href?: string; children?: React.ReactNode }) {
  return (
    <div className="glass glass-interactive led-surface flex flex-col gap-1.5 p-2.5">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-white/40">
        <img src={img} alt={name} className="h-full w-full object-contain" />
      </div>
      <div className="flex items-center justify-between gap-2">
        {href ? <a href={href} target="_blank" className="truncate text-sm font-medium hover:underline" title="view asset on Solana Explorer">{name} <span className="text-zinc-400">↗</span></a> : <div className="truncate text-sm font-medium">{name}</div>}
        {badge && <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${BADGE[badge] ?? BADGE.default}`}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}
export const Err = ({ msg }: { msg: string | null }) => (msg ? <p className="glass p-3 text-sm text-red-700">{msg}</p> : null);

let solUsd: Promise<number> | null = null;
export function useSolPrice() {
  const [p, setP] = useState<number | null>(null);
  useEffect(() => { (solUsd ??= api<{ usd: number }>("/api/sol-price").then((r) => r.usd)).then(setP).catch(() => {}); }, []);
  return p;
}
export const usd = (lamports: number, p: number) => "≈ $" + ((lamports / 1e9) * p).toLocaleString("en-US", { maximumFractionDigits: 2 });
/** "0.500 SOL ≈ $75.12" — SOL is the unit of settlement, USD is a hint. */
export function Price({ lamports, className = "" }: { lamports: number; className?: string }) {
  const p = useSolPrice();
  return <span className={`inline-flex flex-wrap items-baseline gap-x-1 font-mono tabular-nums ${className}`}><span className="whitespace-nowrap text-nr">{sol(lamports)}</span>{p ? <span className="whitespace-nowrap text-xs text-zinc-600">{usd(lamports, p)}</span> : null}</span>;
}
