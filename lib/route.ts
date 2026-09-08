// ponytail: one error wrapper for all route handlers
type Handler<C> = (req: Request, ctx: C) => Promise<unknown>;
// ponytail: translate the few onchain errors a demo user actually hits
const friendly = (m: string) => {
  if (transient(m)) return "Devnet RPC is rate-limiting, retry in a few seconds";
  const ins = m.match(/insufficient lamports (\d+), need (\d+)/);
  if (ins) return `Not enough SOL: wallet has ${(+ins[1] / 1e9).toFixed(3)}, this needs ${(+ins[2] / 1e9).toFixed(3)} (plus fees). Airdrop devnet SOL at faucet.solana.com.`;
  if (/blockhash not found|block height exceeded/i.test(m)) return "Transaction expired before it was signed — try again.";
  if (/User rejected/i.test(m)) return "Signature rejected in wallet.";
  return m.split("\n")[0];
};
const transient = (m: string) => /fetch failed|429|Too Many Requests|ECONNRESET|socket/i.test(m);
// ponytail: one retry on flaky public RPC; a paid RPC (Helius) removes the need
export const handle = <C,>(fn: Handler<C>) => async (req: Request, ctx: C) => {
  for (let attempt = 0; ; attempt++) {
    try { return Response.json(await fn(req, ctx)); }
    catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (attempt === 0 && transient(msg) && req.method === "GET") { await new Promise((r) => setTimeout(r, 800)); continue; }
      console.error(msg);
      return Response.json({ error: friendly(msg) }, { status: 400 });
    }
  }
};
export const body = <T,>(req: Request) => req.json() as Promise<T>;
export const uid = () => crypto.randomUUID();
export const now = () => Date.now();
export type P<T> = { params: Promise<T> };
