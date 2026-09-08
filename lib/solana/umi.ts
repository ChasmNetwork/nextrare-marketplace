// server only — never import from client components
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { keypairIdentity, publicKey } from "@metaplex-foundation/umi";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { RPC_URL } from "./connection";

const secret = bs58.decode(process.env.PLATFORM_SECRET!);
export const platformKp = Keypair.fromSecretKey(secret);
export const umi = createUmi(RPC_URL, "confirmed").use(mplCore());
umi.use(keypairIdentity(umi.eddsa.createKeypairFromSecretKey(secret)));
export const PLATFORM = umi.identity.publicKey;
export const COLLECTION = () => publicKey(process.env.COLLECTION!);
