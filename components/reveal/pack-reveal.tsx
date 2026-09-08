"use client";
import { useEffect, useState } from "react";
import { CardFlip } from "./card-flip";
import { UrFlare } from "./ur-flare";
import { Fx } from "./fx";

export type Won = { id: string; name: string; imageUri: string; askLamports: number };
/** ask → rarity tier (1 grey … 5 rainbow). Drives shake, flare tint and stinger. */
export const tierFor = (ask: number) => (ask < 0.15e9 ? 1 : ask < 0.4e9 ? 2 : ask < 0.8e9 ? 3 : ask < 1.5e9 ? 4 : 5);
const SHAKE = ["", "", "shake-subtle", "shake-subtle", "shake-intense", "shake-super"];
const STING = ["", "win-small", "win-small", "win-big", "win-huge", "win-huge"];
const play = (n: string, vol = 0.7) => { try { const a = new Audio(`/reveal/audio/${n}.mp3`); a.volume = vol; void a.play().catch(() => {}); } catch {} };

/**
 * Pack theater. busy → pack shakes (payment + roll in flight). won → pack pops, card flips in with rarity flare.
 * `children` = idle content under the pack (pull button etc). `onDone` fires once the flip settles.
 */
export function PackReveal({ busy, won, onDone, children }: { busy: boolean; won: Won | null; onDone: () => void; children?: React.ReactNode }) {
  // parent remounts us via key={won?.id}, so initial phase is derived, not set in an effect
  const [phase, setPhase] = useState<"idle" | "pop" | "card">(won ? "pop" : "idle");
  const tier = won ? tierFor(won.askLamports) : 1;
  useEffect(() => { if (busy) play("pack-opening", 0.5); }, [busy]);
  useEffect(() => {
    if (phase !== "pop") return;
    play("pack-opened", 0.7);
    const t = setTimeout(() => { setPhase("card"); play("card-whoosh", 0.6); }, 650);
    return () => clearTimeout(t);
  }, [phase]);
  const onFlipped = () => { if (STING[tier]) play(STING[tier], 0.8); onDone(); };

  if (phase === "idle") return (
    <>
      <img src="/pack.png" alt="" className={`mx-auto h-56 object-contain transition ${busy ? "shake-intense drop-shadow-[0_0_24px_rgba(221,32,35,.55)]" : ""}`} />
      {busy && <p className="text-center text-xs font-medium text-zinc-700">Paying · rolling…</p>}
      {!busy && children}
    </>
  );
  return (
    <div className="relative mx-auto aspect-[3/4] w-full max-w-[280px] overflow-hidden rounded-2xl bg-[#0b0b0d]">
      {phase === "card" && tier >= 2 && <UrFlare tier={tier} className="pointer-events-none absolute inset-0 h-full w-full mix-blend-screen" />}
      {phase === "card" && tier >= 4 && <Fx type="vortex" tier={tier} />}
      {phase === "card" && tier >= 2 && <Fx type="border" tier={tier} />}
      {phase === "pop" && <img src="/pack.png" alt="" className="pack-pop absolute inset-0 m-auto h-[85%] object-contain" />}
      {phase === "card" && tier >= 4 && <Fx type="shine" tier={tier} over />}
      {phase === "card" && won && (
        <div className="absolute inset-4" style={{ zIndex: 2 }}>
          <CardFlip big={tier >= 4} onDone={onFlipped}>
            <img src={won.imageUri} alt={won.name} className={`h-full w-auto max-w-full rounded-lg object-contain ${SHAKE[tier] && tier >= 4 ? "" : ""}`} style={{ filter: tier >= 4 ? "drop-shadow(0 0 18px rgba(255,200,80,.6))" : undefined }} />
          </CardFlip>
        </div>
      )}
    </div>
  );
}
