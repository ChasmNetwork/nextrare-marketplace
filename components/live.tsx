"use client";
import { useEffect, useState } from "react";

/** Pulsing live dot + "updated Ns ago". Goes amber if the feed is stale (> 3× interval). */
export function Live({ at, every = 8000, className = "" }: { at: number | null; every?: number; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const age = at ? Math.max(0, Math.round((now - at) / 1000)) : null;
  const stale = age !== null && age * 1000 > every * 3;
  const color = at === null ? "bg-zinc-400" : stale ? "bg-amber-500" : "bg-emerald-500";
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[10px] uppercase tracking-wide text-neutral-500 ${className}`} title={at ? new Date(at).toLocaleTimeString() : "connecting"}>
      <span className="relative flex h-2 w-2">
        {!stale && at !== null && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${color}`} />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
      </span>
      {at === null ? "connecting" : `live · ${age === 0 ? "now" : `${age}s ago`}`}
    </span>
  );
}
