"use client";
import { PackRows } from "@/components/pack-rows";
export default function Packs() {
  return <div className="space-y-6"><div><h1 className="text-3xl font-bold">Packs</h1><p className="text-zinc-600">Pull price = expected value of the pack. Odds ∝ 1/ask. Keep it, or sell back at 85% and the spread pays the listers.</p></div><PackRows /></div>;
}
