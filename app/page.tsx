"use client";
import { Suspense, useState } from "react";
import { MarketGrid } from "@/components/market-grid";
import { PackTheater } from "@/components/pack-theater";
import { MePanel } from "@/components/me-panel";
import { Stat } from "@/components/stat";
import { PoolChart } from "@/components/charts/pool-chart";
import { PackDonut } from "@/components/charts/pack-donut";
import { PACKS, type PackSlug } from "@/lib/packs";
import { useJson, useSolPrice } from "@/components/ui";
import { Live } from "@/components/live";
import { Onboarding } from "@/components/onboarding";
import { ActivityFeed } from "@/components/activity-feed";
import { NetChip } from "@/components/net-chip";
import { useWallet } from "@solana/wallet-adapter-react";
import { addr } from "@/lib/client";

type Stats = { collection: string | null; platform: string | null; listings: number; value: number; listers: number; pulls: number; kept: number; soldBack: number; volume: number; pool: number; byPack: Record<string, { cards: number; value: number }>; activity: { t: number; status: string; price: number; pool: number }[] };

export default function Dashboard() {
  const { data: s, at } = useJson<Stats>("/api/stats", [], 8000);
  const p = useSolPrice();
  const [pack, setPack] = useState<PackSlug>("mid");
  const { publicKey } = useWallet();
  const usd = (l: number) => (p ? (l / 1e9) * p : null);
  return (
    <div className="rise space-y-6">
      <section id="overview" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold sm:text-3xl">List once. Get paid two ways.</h1><Live at={at} className="glass glass-pill px-2.5 py-1" /></div>
            <p className="mt-1 text-base font-medium text-zinc-800">Sell your slab at your price, or let someone rip it in a pack. Cash-outs pay you rent.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {s?.collection && <a href={addr(s.collection)} target="_blank" className="glass glass-pill glass-interactive px-3 py-1.5 font-medium text-zinc-800">Cards onchain ↗</a>}
            {s?.platform && <a href={addr(s.platform)} target="_blank" className="glass glass-pill glass-interactive px-3 py-1.5 font-medium text-zinc-800">Payout wallet ↗</a>}
            <NetChip />
          </div>
        </div>
        <Onboarding />
        <div className="rise grid min-w-0 items-start gap-3 [&>*]:min-w-0 lg:grid-cols-2 2xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,2fr)_minmax(0,2fr)]">
          <div className="grid min-w-0 grid-cols-1 gap-2 min-[420px]:grid-cols-2">
            <Stat label="Cards for sale" sol={(s?.value ?? 0) / 1e9} usd={usd(s?.value ?? 0)} hint={`${s?.listings ?? 0} cards · ${s?.listers ?? 0} sellers`} />
            <Stat label="Paid to sellers" sol={(s?.pool ?? 0) / 1e9} usd={usd(s?.pool ?? 0)} hint="withdrawable any time" accent="#dd2023" />
            <Stat label="Ripped in packs" sol={(s?.volume ?? 0) / 1e9} usd={usd(s?.volume ?? 0)} hint={`${s?.pulls ?? 0} pulls`} />
            <Stat label="Cash-out rate" sol={s?.pulls ? Math.round((s.soldBack / s.pulls) * 100) : 0} plain suffix="%" meter={s?.pulls ? s.soldBack / s.pulls : 0} hint={`${s?.kept ?? 0} kept · ${s?.soldBack ?? 0} cashed out`} />
          </div>
          <PoolChart activity={s?.activity ?? []} label="Rent paid to sellers" live={at} />
          <PackDonut byPack={s?.byPack ?? {}} solUsd={p} live={at} />
          <ActivityFeed me={publicKey?.toBase58()} />
        </div>
      </section>

      <section id="packs" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-bold">Packs</h2><p className="text-sm text-zinc-700">Rip a pack at fair average price. Keep what you hit, or cash out at 85%.</p></div>
          <div className="glass glass-pill flex p-1">{PACKS.map((x) => <button key={x.slug} onClick={() => setPack(x.slug)} className="seg" data-active={pack === x.slug}>{x.name}</button>)}</div>
        </div>
        <PackTheater key={pack} slug={pack} />
      </section>

      <section id="market" className="space-y-3">
        <h2 className="text-xl font-bold">Buy now</h2>
        <MarketGrid hero={false} />
      </section>

      <section id="me" className="space-y-3">
        <h2 className="text-xl font-bold">My cards &amp; earnings</h2>
        <Suspense fallback={null}><MePanel /></Suspense>
      </section>
    </div>
  );
}
