"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { api } from "@/lib/client";
import { Btn, Err } from "@/components/ui";
import { getRef } from "@/components/track";

const DONE = "nr:fb";
const ROLES = ["collector", "seller", "both", "curious"] as const;

/** Floating feedback capture. Opens itself once, after the user has actually done something. */
export function Feedback() {
  const { publicKey } = useWallet();
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [role, setRole] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // nudge after the first rip: pack-theater fires this once the reveal lands
  useEffect(() => {
    const f = () => { try { if (!localStorage.getItem(DONE)) setOpen(true); } catch { setOpen(true); } };
    window.addEventListener("nr:ask-feedback", f);
    return () => window.removeEventListener("nr:ask-feedback", f);
  }, []);

  const send = async () => {
    setBusy(true); setErr(null);
    try {
      await api("/api/feedback", { wallet: publicKey?.toBase58(), score, role, note, ref: getRef() });
      try { localStorage.setItem(DONE, "1"); } catch {}
      setSent(true); setTimeout(() => setOpen(false), 1400);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed bottom-4 right-4 z-30 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2">
      {open && (
        <div className="glass drop-in w-80 max-w-full p-3">
          {sent ? (
            <p className="py-6 text-center text-sm font-semibold text-emerald-700">Thank you — logged onchain-adjacent 😄</p>
          ) : (
            <>
              <p className="text-sm font-bold">Would you use this for real cards?</p>
              <div className="mt-2 flex gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setScore(s)} aria-label={`${s} of 5`}
                    className={`glass-interactive h-9 flex-1 rounded-xl text-sm font-bold transition ${score >= s ? "bg-[var(--nr)] text-white" : "bg-white/60 text-zinc-700"}`}>{s}</button>
                ))}
              </div>
              <p className="mt-2.5 text-xs font-medium text-zinc-700">You are a…</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {ROLES.map((r) => (
                  <button key={r} onClick={() => setRole(r)}
                    className={`glass-interactive h-8 rounded-full px-3 text-xs font-semibold capitalize transition ${role === r ? "bg-zinc-900 text-white" : "bg-white/60 text-zinc-700"}`}>{r}</button>
                ))}
              </div>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={600}
                placeholder="What would make you list a card here? (optional)"
                className="mt-2.5 w-full resize-none rounded-xl border border-black/10 bg-white/70 p-2 text-sm outline-none focus:border-[var(--nr)]/50" />
              <div className="mt-2 flex gap-2">
                <Btn busy={busy} disabled={!score} onClick={send} className="flex-1">Send feedback</Btn>
                <button onClick={() => setOpen(false)} className="glass glass-interactive h-9 shrink-0 rounded-full px-3 text-sm font-semibold text-zinc-700">Later</button>
              </div>
              <div className="mt-2"><Err msg={err} /></div>
            </>
          )}
        </div>
      )}
      <button onClick={() => setOpen((v) => !v)}
        className="glass glass-prominent glass-interactive flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold text-zinc-900">
        {sent ? "★ Feedback sent" : "Give feedback"}
      </button>
    </div>
  );
}
