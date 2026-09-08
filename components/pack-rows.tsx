"use client";
import Link from "next/link";
import { PACKS } from "@/lib/packs";
import { useJson, Price, Btn } from "@/components/ui";
import { sol } from "@/lib/client";

type PackData = { price: number; open: boolean; cards: { id: string; name: string; imageUri: string; askLamports: number; prob: number }[]; stats: { pulls: number; pool: number; totalAsk: number } };

function PackRow({ slug, name, onOpen }: { slug: string; name: string; onOpen?: (slug: string) => void }) {
  const { data } = useJson<PackData>(`/api/packs/${slug}`, [], 10000);
  return (
    <section className="glass p-5">
      <div className="flex flex-wrap items-center gap-4">
        <img src="/pack.png" alt="" className="h-24 w-16 object-contain" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold">{name}</h2>
          <p className="text-sm text-zinc-600">
            {data ? <>{data.cards.length} cards worth {sol(data.stats.totalAsk)} · {data.stats.pulls} rips · {sol(data.stats.pool)} rent paid</> : "…"}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Pull price</div>
          <div className="text-lg font-semibold">{data ? <Price lamports={data.price} /> : "…"}</div>
        </div>
        {onOpen ? <Btn disabled={data ? !data.open : true} onClick={() => onOpen(slug)}>Open pack</Btn> : <Link href={`/packs/${slug}`}><Btn disabled={data ? !data.open : true}>Open pack</Btn></Link>}
      </div>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2 rail">
        {data?.cards.map((c) => (
          <Link key={c.id} href={`/packs/${slug}`} className="glass glass-strong glass-interactive w-28 shrink-0 p-2">
            <div className="aspect-[3/4] overflow-hidden rounded-xl bg-white/40"><img src={c.imageUri} alt={c.name} className="h-full w-full object-contain" /></div>
            <div className="mt-1 truncate text-[11px] font-medium">{c.name.replace(/ · PSA.*$/, "")}</div>
            <div className="flex justify-between text-[11px]"><span className="text-nr">{sol(c.askLamports)}</span><span className="text-zinc-500">{(c.prob * 100).toFixed(0)}%</span></div>
          </Link>
        ))}
        {data && !data.cards.length && <p className="text-sm text-zinc-500">Empty. List a card in this price band.</p>}
      </div>
    </section>
  );
}
export function PackRows({ onOpen }: { onOpen?: (slug: string) => void }) {
  return <div className="grid gap-4 2xl:grid-cols-3">{PACKS.map((p) => <PackRow key={p.slug} {...p} onOpen={onOpen} />)}</div>;
}
