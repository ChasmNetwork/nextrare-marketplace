"use client";
// Reveal theater preview without a wallet: /dev/reveal?tier=5
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PackReveal, type Won } from "@/components/reveal/pack-reveal";
import { Btn, Ghost } from "@/components/ui";

const ASK = { 1: 0.1e9, 2: 0.3e9, 3: 0.6e9, 4: 1.2e9, 5: 2.5e9 } as Record<string, number>;
function Demo() {
  const tier = useSearchParams().get("tier") ?? "5";
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState<Won | null>(null);
  const [done, setDone] = useState(false);
  const go = () => { setBusy(true); setWon(null); setDone(false); setTimeout(() => { setBusy(false); setWon({ id: String(Date.now()), name: `Charizard · PSA 8 (tier ${tier})`, imageUri: "/cards/card5.jpg", askLamports: ASK[tier] ?? 2.5e9 }); }, 1800); };
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <aside className="glass space-y-4 p-4">
        <PackReveal key={won?.id ?? "idle"} busy={busy} won={won} onDone={() => setDone(true)}>
          <Btn className="w-full" onClick={go}>Simulate pull (tier {tier})</Btn>
        </PackReveal>
        {won && done && <><div className="text-center font-medium">{won.name}</div><div className="grid grid-cols-2 gap-2"><Btn>Keep</Btn><Ghost>Sell back</Ghost></div><Ghost className="w-full" onClick={() => { setWon(null); setDone(false); }}>Again</Ghost></>}
      </aside>
      <p className="text-center text-xs text-zinc-500">?tier=1…5 · grey · blue · red · gold · rainbow</p>
    </div>
  );
}
export default function Page() { return <Suspense><Demo /></Suspense>; }
