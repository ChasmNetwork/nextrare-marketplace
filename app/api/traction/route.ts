import { db, listings, pulls, yieldLedger, users, feedback } from "@/db";
import { handle } from "@/lib/route";

const GOAL = 10;
// our own demo/script wallets — counted separately so the user number stays honest
const TEAM = new Set((process.env.TEAM_WALLETS ?? [
  "41QAvFoVDbxcwCmxRtzFz1SQ3b5xjSHezCYVgpuduD3b", // platform / vault
  "7mNVL3x6F4tfKvwiaZVV6T8o1C6fWYpTtHN3R1WyCEUT", // demo buyer
  "CspembYYhsKXJ8eDyxoDnJQXH4q35WZ2DeJDubEjeFxn",
  "9BRcBHvYF3ujjCmLf7fdHSPyASGer2e7ef8RX1xUdk9t",
  "JDM9rTfQzd1hWFxRNtJ8rE6CsTVaNiaZcZpffr2GpEYz",
].join(",")).split(",").map((s) => s.trim()).filter(Boolean));

type U = { wallet: string; ref: string | null; firstSeen: number; visits: number; listed: number; ripped: number; bought: number; rentLamports: number; feedback: number; team: boolean };

/** Everything a judge asks about adoption, from data we already store. */
export const GET = handle(async () => {
  const [ls, ps, yl, us, fb] = await Promise.all([
    db.select().from(listings), db.select().from(pulls), db.select().from(yieldLedger),
    db.select().from(users), db.select().from(feedback),
  ]);
  const m = new Map<string, U>();
  const touch = (wallet: string, t: number) => {
    const e = m.get(wallet) ?? { wallet, ref: null, firstSeen: t, visits: 0, listed: 0, ripped: 0, bought: 0, rentLamports: 0, feedback: 0, team: TEAM.has(wallet) };
    e.firstSeen = Math.min(e.firstSeen, t);
    m.set(wallet, e);
    return e;
  };
  for (const u of us) { const e = touch(u.wallet, u.firstSeen); e.ref = u.ref; e.visits = u.visits; }
  for (const l of ls) {
    touch(l.lister, l.createdAt).listed++;
    if (l.buyer && l.status === "sold") touch(l.buyer, l.createdAt).bought++;
  }
  for (const p of ps) if (p.status !== "built" && p.status !== "failed") touch(p.buyer, p.createdAt).ripped++;
  for (const y of yl) touch(y.lister, y.createdAt).rentLamports += y.amountLamports;
  for (const f of fb) if (f.wallet) touch(f.wallet, f.createdAt).feedback++;

  const all = [...m.values()].sort((a, b) => a.firstSeen - b.firstSeen);
  const real = all.filter((u) => !u.team);
  const acted = (u: U) => u.listed + u.ripped + u.bought > 0;
  const funnel = [
    { label: "Connected wallet", n: real.length },
    { label: "Got free slabs / listed", n: real.filter((u) => u.listed > 0).length },
    { label: "Ripped a pack or bought", n: real.filter((u) => u.ripped + u.bought > 0).length },
    { label: "Earned rent", n: real.filter((u) => u.rentLamports > 0).length },
    { label: "Left feedback", n: real.filter((u) => u.feedback > 0).length },
  ];
  const byRef = [...real.reduce((acc, u) => acc.set(u.ref ?? "direct", (acc.get(u.ref ?? "direct") ?? 0) + 1), new Map<string, number>())]
    .map(([ref, n]) => ({ ref, n })).sort((a, b) => b.n - a.n);
  const points = real.map((u, i) => ({ t: u.firstSeen, v: i + 1 }));
  const scores = fb.map((f) => f.score);
  return {
    goal: GOAL,
    users: real.length,
    active: real.filter(acted).length,
    team: all.length - real.length,
    funnel, byRef, points,
    feedback: {
      count: fb.length,
      avg: scores.length ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0,
      dist: [5, 4, 3, 2, 1].map((s) => ({ label: `${s}★`, n: scores.filter((x) => x === s).length })),
      rows: fb.sort((a, b) => b.createdAt - a.createdAt).slice(0, 30),
    },
    list: all,
  };
});
