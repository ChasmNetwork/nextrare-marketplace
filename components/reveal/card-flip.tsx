"use client";
// Ported from gambit/src/components/play/CardFlipReveal.tsx (packs.com clickReveal beat).
import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";

export function CardFlip({ big, holdMs = 300, onDone, children }: { big: boolean; holdMs?: number; onDone?: () => void; children: React.ReactNode }) {
  const posCtrl = useAnimationControls(), rotCtrl = useAnimationControls();
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  const [flipped, setFlipped] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    let cancelled = false;
    if (flipped) { const t = setTimeout(() => onDoneRef.current?.(), 0); return () => clearTimeout(t); }
    (async () => {
      // 1. pull-back & flip-prep
      await Promise.all([
        posCtrl.start({ x: -10, y: 20, scale: 0.975, transition: { duration: big ? 1.0 : 0.6, ease: [0.305, 0.167, 0.179, 1] } }),
        rotCtrl.start({ rotateY: 168, transition: { duration: big ? 0.9 : 0.5 } }),
      ]);
      if (cancelled) return;
      // 2. settle  3. spin 180→1080 (2.5 turns)
      posCtrl.start({ x: 0, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" } });
      await rotCtrl.start({ rotateY: 1080, transition: { type: "spring", stiffness: 200, damping: 22 } });
      if (cancelled) return;
      rotCtrl.set({ rotateY: 0 }); setFlipped(true);
      await new Promise((r) => setTimeout(r, holdMs));
      if (!cancelled) onDoneRef.current?.();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <motion.div animate={posCtrl} initial={{ x: 0, y: 0, scale: 1 }} className={`relative z-10 h-full ${flipped ? "" : "card-flip-scene"}`} style={flipped ? undefined : { willChange: "transform" }}>
      {flipped ? <div className="flex h-full items-center justify-center">{children}</div> : (
        <motion.div animate={rotCtrl} initial={{ rotateY: 180 }} style={{ transformStyle: "preserve-3d", willChange: "transform" }} className="relative h-full">
          <div className="card-flip-front flex h-full items-center justify-center">{children}</div>
          <img src="/cards/back.png" alt="" aria-hidden className="card-flip-back absolute inset-0 m-auto h-full w-auto max-w-full object-contain" />
        </motion.div>
      )}
    </motion.div>
  );
}
