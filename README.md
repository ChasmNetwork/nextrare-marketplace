# NextRare Marketplace — list once, sell two ways

> A trading-card marketplace where listed cards **earn while they wait to sell**. Solana devnet. Built in 48h at Startup Village Borneo (Superteam MY × Solana Foundation) by KC and Li Ho.

## Links
- **Live app (devnet):** https://nextrare-marketplace.vercel.app
- **How it works + waitlist:** https://nextrare-marketplace.vercel.app/about
- **Traction (real wallets, txs, feedback):** https://nextrare-marketplace.vercel.app/traction — our own wallets and the `scripts/sim.ts` load-test wallets are tagged and excluded from the user count.
- **Card collection (Metaplex Core):** https://explorer.solana.com/address/5VBfbWy24xMW7wVgkZb435yTmasCQ76wdW7UdPXvah8M?cluster=devnet
- **Platform vault:** https://explorer.solana.com/address/41QAvFoVDbxcwCmxRtzFz1SQ3b5xjSHezCYVgpuduD3b?cluster=devnet
- **Sample rip, roll recomputed in-browser:** https://nextrare-marketplace.vercel.app/pulls/53f931a6-5a11-4303-a072-c6a524102224 · payment tx with commitment memo: https://explorer.solana.com/tx/2vkveM9shKGBLFad7f2sCnqGG8SSgQ9Jrcmqk3LeBSGAhWRhU1C4RDEMnW1hzPETR42u9xWwHkSSPsTaYfwxSMYa?cluster=devnet

## The problem
Onchain TCG volume is thin. A fairly-priced card sits unsold for weeks, the only fast exit is dumping below market, and a listed card earns nothing while it waits.

## What this does
1. **List once, sell two ways.** A lister sets an ask (market + 0–10%). The card is instantly buyable at that ask *and* sits inside a gacha pack (Budget / Mid / Chase, bucketed by ask).
2. **Gacha pull = pack EV.** Odds ∝ 1/ask. Puller gets 10 minutes: **Keep** (lister paid ask, card transferred) or **Sell back** at 85% of ask (card never moves, stays listed).
3. **Yield while it waits.** The 15% sellback spread is split: half to the platform, half to a **pack yield pool** distributed to every lister in that pack pro-rata by card value / pack value at that moment. Paid monthly.
4. **Paid in seconds.** Kept or bought, the lister receives the ask in the same transaction.

## Why this needs Solana
- **Non-custodial listing.** The card stays in the lister's wallet. Listing = one tx adding Metaplex Core `FreezeDelegate{frozen}` + `TransferDelegate` with the platform as authority. The lister can't unfreeze; the platform can't move it except via buy/keep. Frozen blocks *all* transfers, including delegate transfers, so settlement thaws + transfers in the same tx.
- **Atomic fixed-price buy.** One `VersionedTransaction`: `buyer → lister` SOL, thaw, delegate transfer. Server partial-signs as delegate, buyer co-signs in Phantom, server sends. Two buyers racing: the loser's whole tx reverts, no half-states.
- **Verifiable randomness.** Server commits `sha256(secret)` in a Memo *inside the buyer's payment tx* — before the buyer's signature exists. Roll = `sha256(secret ‖ blockhash ‖ paymentSig)`. Every pull has a `/pulls/[id]` page that recomputes it in the browser. (ORAO VRF slots in behind the same interface.)
- **Auditable payouts.** Sellbacks, keeps, and monthly yield payouts are plain SOL transfers from the vault with explorer links.

## Stack
Next.js 16 · React 19 · `@solana/web3.js` · `@solana/wallet-adapter` · Metaplex Umi + `mpl-core` · drizzle + libsql (Turso via Vercel Marketplace) · Tailwind. **No custom program** — the escrow is Core plugin semantics; the vault is a hot keypair (Anchor PDA vault is the upgrade path).

## Run
```bash
pnpm i
cp .env.example .env.local        # fill PLATFORM_SECRET (bs58 64-byte key), RPC_URL; TURSO_DATABASE_URL/TURSO_AUTH_TOKEN for a hosted DB (else file:local.db)
pnpm db                            # push schema (file:local.db)
pnpm setup                         # fund demo wallets, create collection, mint 24 cards → 3 lister keypairs in .keys/
pnpm dev
pnpm seed                          # listers list 21 cards so all 3 packs open
pnpm tsx lib/pack-math.ts          # self-check of odds / EV / sellback split
```

### No devnet SOL? Run the whole thing on a local validator
```bash
solana-test-validator --reset --url https://api.devnet.solana.com \
  --clone-upgradeable-program CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d   # Metaplex Core
cp .env.example .env.localnet   # RPC_URL=http://127.0.0.1:8899, DATABASE_URL=file:localnet.db
solana airdrop 50 $(solana address) -u http://127.0.0.1:8899
set -a; source .env.localnet; set +a
pnpm db && ENV_FILE=.env.localnet pnpm tsx --env-file=.env.localnet scripts/setup.ts && pnpm dev
API=http://localhost:3000 pnpm tsx --env-file=.env.localnet scripts/seed.ts
API=http://localhost:3000 pnpm tsx --env-file=.env.localnet scripts/e2e.ts   # buy → pull/keep → pull/sellback → payout → provenance, asserts balances
```
Needs Agave ≥ 2.x (`sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"`); the 1.18 runtime rejects the cloned program.

## Flows
| Flow | Signer | Onchain |
|---|---|---|
| List | lister (browser) | `addPlugin(FreezeDelegate{frozen:true, authority:platform})`, `addPlugin(TransferDelegate{authority:platform})` |
| Buy | buyer + platform | `transfer SOL → lister`, `updatePlugin(frozen:false)`, `transfer asset → buyer` (1 tx) |
| Pull | buyer | `transfer SOL → vault` + `Memo nr:<pullId>:<sha256(secret)>` |
| Keep | platform | `transfer SOL vault → lister`, thaw, `transfer asset → buyer` (1 tx) |
| Sell back | platform | `transfer SOL vault → buyer (85%)`; yield rows written per active lister in pack |
| Payout | platform | batched `transfer SOL vault → lister` |
| Delist | platform | `thawAsset` + `revokePluginAuthority(TransferDelegate)` |

## Deliberate simplifications (`// ponytail:` comments in code)
Hot-wallet vault · pubkey-match auth on decide/delist · lazy 10-min expiry (no cron) · snapshot-at-event yield shares (≈ time-weighted) · no refund path if a pack empties mid-pull.

## Roadmap
Anchor PDA vault · USDC · ORAO VRF · mainnet with NextRare graded-slab inventory · mobile (existing Expo app) · cNFT for cheap cards.
