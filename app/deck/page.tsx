"use client";
import { useEffect, useState } from "react";
import { useJson, useSolPrice } from "@/components/ui";

type Stats = { listings: number; listers: number; pulls: number; kept: number; soldBack: number; volume: number; pool: number };
type Tr = { users: number; sim: { wallets: number; rips: number }; feedback: { count: number; avg: number } };
const APP = "nextrare-marketplace.vercel.app";

/** Ten slides, full-bleed, arrow keys / scroll. Slide 5 reads live numbers so the deck never goes stale. */
export default function Deck() {
  const { data: s } = useJson<Stats>("/api/stats", [], 15000);
  const { data: t } = useJson<Tr>("/api/traction", [], 15000);
  const { data: w } = useJson<{ count: number }>("/api/waitlist", [], 30000);
  const p = useSolPrice();
  const [i, setI] = useState(0);
  const usd = (l: number) => (p ? `$${Math.round((l / 1e9) * p).toLocaleString()}` : "…");
  const go = (n: number) => { const el = document.getElementById(`s${n}`); if (el) { el.scrollIntoView({ behavior: "smooth" }); setI(n); } };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(e.key)) { e.preventDefault(); go(Math.min(9, i + 1)); }
      if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); go(Math.max(0, i - 1)); }
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [i]);
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>("[data-slide]")];
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setI(+e.target.getAttribute("data-slide")!)), { threshold: 0.6 });
    els.forEach((el) => io.observe(el)); return () => io.disconnect();
  }, []);

  const slides: { k: string; h: React.ReactNode; body: React.ReactNode }[] = [
    { k: "Title", h: <>NextRare <span className="grad">Marketplace</span></>, body: (
      <>
        <p className="lead">A trading card marketplace where listed cards earn while they wait to sell.</p>
        <p className="meta">KC, Li Ho · live on Solana devnet · built at Startup Village Borneo, Sept 6–8 2026</p>
        <p className="meta"><a href={`https://${APP}`} target="_blank">{APP}</a></p>
      </>
    ) },
    { k: "Problem", h: <>List. Wait. <span className="grad">Hope.</span></>, body: (
      <ul>
        <li>Collectors who list a graded card at a fair price wait weeks.</li>
        <li>The only fast exit is selling under market.</li>
        <li>While it waits, the card earns nothing.</li>
        <li>Every marketplace today works this way.</li>
      </ul>
    ) },
    { k: "Solution", h: <>List once. <span className="grad">Sell two ways.</span></>, body: (
      <ul>
        <li>Your card is buyable at your price, and sits inside a gacha pack at the same time.</li>
        <li>A ripper keeps it: you get full price, instantly.</li>
        <li>A ripper takes cash instead: your card stays, and you get paid rent for waiting.</li>
        <li>The card never leaves your wallet.</li>
      </ul>
    ) },
    { k: "Demo", h: <>Sixty seconds, <span className="grad">no signup.</span></>, body: (
      <>
        <ol>
          <li>Connect Phantom on devnet</li>
          <li>Tap “Get free cards”: two slabs land in your wallet</li>
          <li>List one. It is on sale and in a pack at once</li>
          <li>Rip a pack. Keep the card, or take 85% cash now</li>
          <li>Watch rent land in “My cards &amp; earnings”</li>
        </ol>
        <p className="meta"><a href={`https://${APP}`} target="_blank">Open the live app ↗</a></p>
      </>
    ) },
    { k: "Traction & business model", h: <>Live numbers, <span className="grad">right now.</span></>, body: (
      <>
        <div className="nums">
          <div><b>{t?.users ?? "…"}</b><span>people used it</span></div>
          <div><b>{s?.listings ?? "…"}</b><span>cards listed by {s?.listers ?? "…"} wallets</span></div>
          <div><b>{s?.pulls ?? "…"}</b><span>packs opened</span></div>
          <div><b>{s ? usd(s.volume) : "…"}</b><span>moved through packs</span></div>
          <div><b>{s ? (s.pool / 1e9).toFixed(2) : "…"} SOL</b><span>rent paid to sellers</span></div>
          <div><b>{s?.pulls ? Math.round((s.soldBack / s.pulls) * 10) : "…"} of 10</b><span>rippers took the cash</span></div>
        </div>
        <p className="meta">Plus {t?.sim.wallets ?? 0} simulated wallets ran the full flow as a load test, tagged on the dashboard and not counted. {w?.count ? `${w.count} on the waitlist. ` : ""}{t?.feedback.count ? `${t.feedback.count} feedback replies, ${t.feedback.avg}/5 would use it.` : ""}</p>
        <ul className="tight">
          <li><b>2%</b> when someone buys a card outright.</li>
          <li>On a cash-out the ripper gets <b>85%</b>. The 15% gap is profit, <b>split 50/50</b> with the sellers in that pack.</li>
          <li>They keep the card? Seller gets full price, we take nothing.</li>
        </ul>
      </>
    ) },
    { k: "Market · why now · why Solana", h: <>Slabs are already <span className="grad">onchain.</span></>, body: (
      <ul>
        <li>Graded cards are the liquid end of collectibles, and they are moving onchain: Courtyard, Collector Crypt, NextRare.</li>
        <li>Why now: the assets exist, the marketplaces for them are still list-and-wait.</li>
        <li>Why Solana: the card is locked with a Metaplex Core freeze plugin, so we never hold it. Buy and keep settle in one transaction. Fees are cents, so a $5 pack works. Every roll is provable from the payment transaction.</li>
      </ul>
    ) },
    { k: "Competition", h: <>One listing, <span className="grad">both exits.</span></>, body: (
      <ul>
        <li><b>OpenGacha</b>: gacha only, custodial vault, no fixed-price exit, sellers earn nothing.</li>
        <li><b>Tensor · Magic Eden · Courtyard</b>: fixed price only, idle listings earn nothing.</li>
        <li><b>Us</b>: both exits on one listing, non-custodial, and the waiting itself pays.</li>
      </ul>
    ) },
    { k: "GTM · 3-month plan", h: <>Next <span className="grad">1,000 cards.</span></>, body: (
      <ol>
        <li><b>Month 1</b>: mainnet with NextRare’s own graded slab inventory. Existing collectors are the first sellers.</li>
        <li><b>Month 2</b>: pack partnerships with three card shops and graders. They list, their customers rip.</li>
        <li><b>Month 3</b>: creator packs and referral rent, a share of rent for bringing a seller.</li>
      </ol>
    ) },
    { k: "Team", h: <>Why <span className="grad">us.</span></>, body: (
      <ul>
        <li><b>Li Ho</b>: built NextRare, the graded-card app this plugs into. Shipped this marketplace in three days.</li>
        <li><b>KC</b>: business and partnerships, card shop and grader relationships.</li>
      </ul>
    ) },
    { k: "The ask", h: <>Help us <span className="grad">go mainnet.</span></>, body: (
      <ul>
        <li>Grant support for a security review of the vault and the mainnet launch.</li>
        <li>Intros: Solana Foundation, Metaplex, Superteam MY collectors and card shops.</li>
        <li>Try it now: <a href={`https://${APP}`} target="_blank">{APP}</a></li>
      </ul>
    ) },
  ];

  return (
    <div className="deck fixed inset-0 z-40 overflow-y-auto">
      <style>{`
        .deck { background:#0b0b0d; color:#f4f4f5; scroll-snap-type:y mandatory; font-family:var(--font-sora),system-ui,sans-serif; }
        .deck section { min-height:100dvh; scroll-snap-align:start; display:grid; place-items:center; padding:clamp(20px,5vw,64px); position:relative;
          background: radial-gradient(60% 50% at 80% 0%, rgba(124,58,237,.18), transparent 60%), radial-gradient(50% 50% at 0% 100%, rgba(16,185,129,.14), transparent 60%); }
        .deck .box { width:min(1100px,100%); border:2px solid transparent; border-radius:18px; padding:clamp(20px,4vw,48px);
          background: linear-gradient(#0e0e11,#0e0e11) padding-box, linear-gradient(135deg,#8b5cf6,#22d3ee,#34d399) border-box; }
        .deck .kicker { font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:#a1a1aa; }
        .deck h2 { font-size:clamp(28px,5vw,60px); font-weight:800; line-height:1.05; margin:.35em 0 .6em; letter-spacing:-.02em; }
        .deck .grad { background:linear-gradient(90deg,#8b5cf6,#22d3ee,#34d399); -webkit-background-clip:text; background-clip:text; color:transparent; }
        .deck .lead { font-size:clamp(18px,2.4vw,28px); color:#e4e4e7; max-width:28ch; }
        .deck .meta { color:#a1a1aa; font-size:clamp(13px,1.4vw,16px); margin-top:14px; }
        .deck a { color:#67e8f9; text-decoration:underline; text-underline-offset:3px; }
        .deck ul, .deck ol { display:grid; gap:.55em; font-size:clamp(16px,2vw,24px); line-height:1.35; color:#e4e4e7; padding-left:1.2em; max-width:60ch; }
        .deck ol { list-style:decimal; } .deck ul { list-style:disc; }
        .deck .tight { font-size:clamp(14px,1.6vw,19px); margin-top:18px; }
        .deck .nums { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin-bottom:6px; }
        .deck .nums div { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:14px; }
        .deck .nums b { display:block; font-size:clamp(24px,3.2vw,40px); font-weight:800; letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
        .deck .nums span { color:#a1a1aa; font-size:13px; }
        .deck .pager { position:fixed; right:14px; top:50%; transform:translateY(-50%); display:grid; gap:8px; z-index:2; }
        .deck .pager button { width:8px; height:8px; border-radius:99px; background:rgba(255,255,255,.25); border:0; padding:0; cursor:pointer; }
        .deck .pager button[data-on="true"] { background:#22d3ee; height:22px; }
        .deck .foot { position:absolute; left:0; right:0; bottom:12px; display:flex; justify-content:space-between; padding:0 clamp(20px,5vw,64px); color:#71717a; font-size:12px; }
        @media print { .deck { position:static; } .deck section { min-height:0; page-break-after:always; } .deck .pager { display:none; } }
      `}</style>
      <div className="pager" aria-hidden>{slides.map((_, n) => <button key={n} data-on={i === n} onClick={() => go(n)} />)}</div>
      {slides.map((sl, n) => (
        <section key={n} id={`s${n}`} data-slide={n}>
          <div className="box">
            <div className="kicker">{String(n + 1).padStart(2, "0")} · {sl.k}</div>
            <h2>{sl.h}</h2>
            {sl.body}
          </div>
          <div className="foot"><span>NextRare Marketplace</span><span>{n + 1} / {slides.length}</span></div>
        </section>
      ))}
    </div>
  );
}
