"use client";
import { Suspense } from "react";
import { MePanel } from "@/components/me-panel";
export default function Page() { return <Suspense fallback={<p className="text-zinc-500">Loading…</p>}><MePanel /></Suspense>; }
