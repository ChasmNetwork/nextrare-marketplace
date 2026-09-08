"use client";
import { useEffect, useState } from "react";

const APP = "nextrare-marketplace.vercel.app";

/** Ten slides, full-bleed, arrow keys / scroll. Live devnet numbers live on /traction, linked from slide 4. */
export default function Deck() {
  const [i, setI] = useState(0);
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
    { k: "Title", h: <><span className="grad">NextRare</span></>, body: (
      <>
        <p className="lead">A trading card show at your fingertips.</p>
        <p className="meta">Marketplace and gacha in one. List a card once, sell it two ways, earn while it waits.</p>
        <p className="meta">KC Thee, Li Ho · live on Solana devnet · built at Startup Village Borneo, Sept 6–8 2026</p>
        <p className="meta"><a href={`https://${APP}`} target="_blank">{APP}</a></p>
      </>
    ) },
    { k: "Problem", h: <>List. Wait. <span className="grad">Hope.</span></>, body: (
      <ul>
        <li>Card demand never switches off, it moves between formats: Web2 marketplaces, tokenised cards, onchain gacha, thousands of local shops. Nothing connects them.</li>
        <li>A collector who lists a graded card at a fair price waits weeks. The only fast exit is selling under market.</li>
        <li>While it waits, the card earns nothing.</li>
      </ul>
    ) },
    { k: "Solution", h: <>List once. <span className="grad">Sell two ways.</span></>, body: (
      <ul>
        <li>Your card is buyable at your price, and sits inside a gacha pack at the same time.</li>
        <li>A ripper keeps it: you get full price, instantly. A ripper takes cash instead: your card stays, and you get paid rent for waiting.</li>
        <li>The card never leaves your wallet. A Metaplex Core freeze plugin holds it, not us.</li>
        <li>This is the onchain version of the stake-to-earn layer inside NextRare, the gacha we already run.</li>
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
        <p className="meta"><a href={`https://${APP}`} target="_blank">Open the live app ↗</a> · <a href={`https://${APP}/traction`} target="_blank">Live traction ↗</a></p>
      </>
    ) },
    { k: "Traction & business model", h: <>The gacha already <span className="grad">works.</span></>, body: (
      <>
        <p className="meta" style={{ marginTop: 0 }}>NextRare gacha, live since January 2026 · 8 months · no paid acquisition</p>
        <div className="nums">
          <div><b>$1.26M</b><span>gross merchandise value</span></div>
          <div><b>$836k</b><span>transaction volume · 8,074 orders</span></div>
          <div><b>256</b><span>paying users · 2,537 signed in</span></div>
          <div><b>$3,265</b><span>volume per paying user</span></div>
          <div><b>$427k</b><span>cash returned on sell-backs</span></div>
          <div><b>1,046</b><span>packs opened in the offline pilot since May</span></div>
        </div>
        <ul className="tight">
          <li>A typical cycle: pull a card worth <b>$42</b>, sell it back for <b>$38</b>. <b>86%</b> of cards are sold back, so inventory recycles instead of shipping out.</li>
          <li>This marketplace: <b>2%</b> on direct buys. On a cash-out the ripper gets <b>85%</b>, the 15% gap is profit, <b>split 50/50</b> with the sellers in that pack.</li>
        </ul>
      </>
    ) },
    { k: "Market · why now · why Solana", h: <>Validated in the West. <span className="grad">Empty in SEA.</span></>, body: (
      <ul>
        <li>Collector Crypt did ~$153M of gacha spend in Q1 2026. Courtyard went from $50k to ~$50M a month. Beezie has $170M+ cumulative GMV. All Western, online only, single brand.</li>
        <li>Southeast Asia is the fastest-growing TCG market, deep collector culture, dense card-shop networks, and no aggregated hybrid platform.</li>
        <li>Why Solana: non-custodial listings via Core plugins, one-transaction settlement, fees in cents so a $5 pack works, and every roll provable from the payment transaction.</li>
      </ul>
    ) },
    { k: "Competition", h: <>One listing, <span className="grad">both exits.</span></>, body: (
      <ul>
        <li><b>Collector Crypt · Courtyard · Beezie · OpenGacha</b>: buy their own players, hold their own inventory, one exit per listing, sellers earn nothing while they wait.</li>
        <li><b>Tensor · Magic Eden</b>: fixed price only, idle listings earn nothing.</li>
        <li><b>Us</b>: both exits on one listing, non-custodial, the waiting itself pays, and physical rails in SEA.</li>
      </ul>
    ) },
    { k: "GTM · 3-month plan", h: <>Distribution we <span className="grad">already have.</span></>, body: (
      <ol>
        <li><b>Activate</b> the 2,537 registered NextRare users against 256 paying: they become the first sellers and rippers on mainnet.</li>
        <li><b>Penang flagship</b> opens October 2026, ~100 walk-ins a day, $300k+ of consignor inventory. The app is the shop’s wallet, so every purchase onboards a user.</li>
        <li><b>Partners</b>: Speculate and CatchaCard live as white-label channels; Slabz and Discover Collectibles confirmed. Their inventory lists here, their users rip here.</li>
      </ol>
    ) },
    { k: "Team", h: <>Why <span className="grad">us.</span></>, body: (
      <ul>
        <li><b>KC Thee</b>, CEO: helped scale Binance across Southeast Asia, P2P and futures. Advisor to Virtuals.</li>
        <li><b>John Koh</b>, CTO: former ML engineer at Eligible (YC 2012), Bitcoin since 2011.</li>
        <li><b>Huey Lau</b>, COO: built Discover Collectibles, 130+ merchants across SEA retail.</li>
        <li><b>Li Ho</b>, engineering: built the NextRare app and shipped this marketplace in three days.</li>
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
          <div className="foot"><span>NextRare</span><span>{n + 1} / {slides.length}</span></div>
        </section>
      ))}
    </div>
  );
}
