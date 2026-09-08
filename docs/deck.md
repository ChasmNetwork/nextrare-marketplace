# NextRare Marketplace — 10-slide deck (SVB template order)

**01 Title** — NextRare Marketplace. "A trading card marketplace where listed cards earn while they wait to sell." Li Ho, KC. Solana devnet, live.

**02 Problem** — Who hurts: onchain TCG holders. How badly: fair-priced cards sit unsold for weeks; only fast exit is selling below market; a listed card earns nothing while it waits. How often: every listing, every day. (Add one real NextRare data point: median days-to-sell / % listings unsold at 30d.)

**03 Solution** — List once, sell two ways. Ask = market + 0–10%. Card is buyable at ask AND inside a gacha pack. Puller keeps (lister paid ask) or sells back at 85% (card stays listed). Half the 15% spread flows to the pack's listers pro-rata, paid monthly. Paid in seconds either way.

**04 Demo / Product** — Live: connect → list card (one tx locks it in your wallet) → buyer buys atomically → pull pack → keep/sellback → lister yield ticks up → month-end payout tx → verify randomness page. Explorer links on screen.

**05 Traction & Business model** — NextRare already runs gacha for graded slabs (mobile app, MegaETH). Ten users: listers from that base this week (names/handles). Revenue: 7.5% of ask on every sellback (~8% gross on sellback volume); 0 on keeps. Yield to listers up to ~4%/month at current sellback rates.

**06 Market / Why now / Why Solana** — TCG secondary market ~$X B; onchain slabs growing (Collector Crypt, Courtyard ≈ $ volume). Why now: tokenised slabs exist, liquidity doesn't. Why Solana: non-custodial escrow via Core plugins (no custom program), atomic SOL-for-card settlement, sub-second confirms, cents in fees so a 0.05 SOL card is still worth listing.

**07 Competition** — OpenGacha: custodial vault, gacha only, no fixed-price exit, no lister yield. Tensor / Magic Eden: fixed price only, no yield, listing earns nothing. Collector Crypt / Courtyard: vend from own inventory, not a marketplace. We win: dual exit + yield on idle inventory, non-custodial.

**08 GTM / 3-month plan** — M1: mainnet with NextRare slab inventory (existing holders list). M2: 3 partner collections whitelisted, ORAO VRF, Anchor PDA vault. M3: mobile (existing Expo app), USDC, 1,000 listings. Distribution: existing NextRare users + gacha streamers.

**09 Team** — Li Ho (full-stack, built this solo in 48h; NextRare app + backend), KC (ops/BD, TCG market). Why us: already operate a gacha business with real slab inventory and settlement rails.

**10 The ask** — Grant/prize → audit + Anchor vault; Solana Foundation intro to Collector Crypt / Courtyard; 3 pilot collections. What we'll do: mainnet in 30 days.
