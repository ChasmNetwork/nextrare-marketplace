import { Connection } from "@solana/web3.js";
export const RPC_URL = process.env.RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
export const conn = new Connection(RPC_URL, "confirmed");
export const explorerTx = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
export const explorerAddr = (a: string) => `https://explorer.solana.com/address/${a}?cluster=devnet`;
export const sol = (lamports: number) => (lamports / 1e9).toFixed(3);
