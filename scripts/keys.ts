import { Keypair } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
export const loadKp = (p: string) => Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(p, "utf8"))));
export const funder = () => loadKp(`${homedir()}/.config/solana/id.json`);
export const named = (n: string) => loadKp(`.keys/${n}.json`);
export const LISTERS = ["lister1", "lister2", "lister3"];
