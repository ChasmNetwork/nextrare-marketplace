import { handle, body } from "@/lib/route";
import { listTx } from "@/lib/solana/core";
export const POST = handle(async (req) => { const { asset, lister } = await body<{ asset: string; lister: string }>(req); return listTx(asset, lister); });
