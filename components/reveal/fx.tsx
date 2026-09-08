"use client";
import { useEffect, useRef } from "react";

const SRC = { vortex: "/reveal/fx-video/vortex-fx.mp4", border: "/reveal/fx-video/border-fx.mp4", shine: "/reveal/fx-video/shine-fx.mp4", energy: "/reveal/fx-video/energy-fx.mp4", energyBg: "/reveal/fx-video/energy-bg-fx.mp4" } as const;
// tier tint, ported from gambit's rarity filters (grey → gold → red)
const TINT = ["", "grayscale(1)", "grayscale(1) sepia(1) saturate(4) hue-rotate(-167deg)", "grayscale(1) sepia(1) saturate(4) hue-rotate(-20deg)", "grayscale(1) sepia(1) saturate(6) hue-rotate(-37deg)", "grayscale(1) sepia(1) saturate(6) hue-rotate(-49deg)"];

/** One FX video layer, screen-blended over the reveal. ponytail: plain <video>, no pooling — desktop demo, autoplay follows a click. */
export function Fx({ type, tier, over }: { type: keyof typeof SRC; tier: number; over?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { const v = ref.current; if (v) void v.play().catch(() => {}); }, []);
  return (
    <video ref={ref} src={SRC[type]} muted playsInline autoPlay loop={type !== "shine"}
      className="pointer-events-none absolute inset-0 h-full w-full object-cover mix-blend-screen"
      style={{ zIndex: over ? 3 : 1, filter: type === "shine" ? undefined : TINT[Math.min(tier, 5)], opacity: over ? 0.85 : 0.9 }} />
  );
}
