"use client";
import { VersionedTransaction } from "@solana/web3.js";

export async function api<T = unknown>(url: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
  const r = await fetch(url, body ? { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) } : { cache: "no-store" });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? r.statusText);
  return j as T;
}
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
/** Deserialize server-built tx, let the wallet sign, hand bytes back. */
export async function signBuilt(txB64: string, signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>) {
  const signed = await signTransaction(VersionedTransaction.deserialize(fromB64(txB64)));
  return toB64(signed.serialize());
}
export const sol = (lamports: number) => (lamports / 1e9).toFixed(3) + " SOL";
export const short = (a: string) => a.slice(0, 4) + "…" + a.slice(-4);
export const tx = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
export const addr = (a: string) => `https://explorer.solana.com/address/${a}?cluster=devnet`;
