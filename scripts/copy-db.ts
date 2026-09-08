// SRC=file:local.db DST=libsql://... DST_TOKEN=... pnpm tsx scripts/copy-db.ts — copy all rows local → remote (listings already exist onchain, no re-signing needed)
import { createClient } from "@libsql/client";

async function main() {
  const src = createClient({ url: process.env.SRC ?? "file:local.db" });
  const dst = createClient({ url: process.env.DST!, authToken: process.env.DST_TOKEN });
  for (const t of ["listings", "pulls", "yield_ledger", "payouts"]) {
    const { rows, columns } = await src.execute(`select * from ${t}`);
    await dst.execute(`delete from ${t}`);
    for (const r of rows) {
      await dst.execute({ sql: `insert into ${t} (${columns.join(",")}) values (${columns.map(() => "?").join(",")})`, args: columns.map((c) => r[c] as never) });
    }
    console.log(t, rows.length, "rows");
  }
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
