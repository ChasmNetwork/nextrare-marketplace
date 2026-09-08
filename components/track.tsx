"use client";
import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

const KEY = "nr:ref";

/** Sticky ?ref= so a link shared at the event is still attributed after a reload. */
export function getRef() {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search).get("ref");
  if (q) localStorage.setItem(KEY, q.slice(0, 32));
  return localStorage.getItem(KEY);
}

/** One POST per wallet connect — that is the "user acquired" event. */
export function Track() {
  const { publicKey } = useWallet();
  useEffect(() => {
    const w = publicKey?.toBase58();
    if (!w) return;
    const ref = getRef();
    fetch("/api/users/seen", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ wallet: w, ref }) }).catch(() => {});
  }, [publicKey]);
  return null;
}
