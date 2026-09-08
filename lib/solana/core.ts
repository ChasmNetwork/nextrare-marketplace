// server only — Metaplex Core listing mechanics
import {
  addPlugin, updatePlugin, transfer, fetchAsset, fetchCollection, thawAsset, revokePluginAuthority, fetchAssetsByOwner,
} from "@metaplex-foundation/mpl-core";
import { createNoopSigner, publicKey, transactionBuilder, type TransactionBuilder } from "@metaplex-foundation/umi";
import { toWeb3JsInstruction } from "@metaplex-foundation/umi-web3js-adapters";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import bs58 from "bs58";
import { umi, PLATFORM, COLLECTION, platformKp } from "./umi";
import { buildTx, sendServer } from "./tx";

const w3 = (b: TransactionBuilder) => b.getInstructions().map(toWeb3JsInstruction);
const addrIs = (a: { type: string; address?: unknown } | undefined, pk: string) => a?.type === "Address" && String(a.address) === pk;

/** Cards in our collection owned by `owner`. */
export async function ownedCards(owner: string) {
  const all = await fetchAssetsByOwner(umi, owner);
  const col = COLLECTION();
  return all
    .filter((a) => a.updateAuthority.type === "Collection" && a.updateAuthority.address === col)
    .map((a) => ({ asset: a.publicKey as string, name: a.name, uri: a.uri, frozen: !!a.freezeDelegate?.frozen }));
}

/** Lister signs: add FreezeDelegate{frozen} + TransferDelegate, both with platform as authority. Non-custodial lock. */
export async function listTx(asset: string, lister: string) {
  const owner = createNoopSigner(publicKey(lister));
  const common = { asset: publicKey(asset), collection: COLLECTION(), authority: owner, payer: owner };
  const auth = { type: "Address", address: PLATFORM } as const;
  const ixs = w3(
    transactionBuilder()
      .add(addPlugin(umi, { ...common, plugin: { type: "FreezeDelegate", frozen: true, authority: auth } }))
      .add(addPlugin(umi, { ...common, plugin: { type: "TransferDelegate", authority: auth } })),
  );
  return buildTx(new PublicKey(lister), ixs);
}

/** Chain is the source of truth: asset owned by lister, frozen, both delegates = platform. */
export async function verifyListed(asset: string, lister: string) {
  const a = await fetchAsset(umi, publicKey(asset));
  const ok = a.owner === lister && !!a.freezeDelegate?.frozen && addrIs(a.freezeDelegate?.authority, PLATFORM) && addrIs(a.transferDelegate?.authority, PLATFORM);
  return { ok, name: a.name, uri: a.uri };
}

async function thawAndTransferIxs(asset: string, newOwner: string) {
  const a = await fetchAsset(umi, publicKey(asset));
  const col = await fetchCollection(umi, COLLECTION());
  return {
    asset: a,
    ixs: w3(
      transactionBuilder()
        .add(updatePlugin(umi, { asset: a.publicKey, collection: col.publicKey, authority: umi.identity, plugin: { type: "FreezeDelegate", frozen: false } }))
        .add(transfer(umi, { asset: a, collection: col, newOwner: publicKey(newOwner), authority: umi.identity })),
    ),
  };
}

/** Atomic fixed-price buy: buyer pays lister + card thaw + transfer, one tx. Platform partial-signs as delegate. */
export async function buildBuyTx(l: { asset: string; lister: string; askLamports: number }, buyer: string) {
  const { asset, ixs } = await thawAndTransferIxs(l.asset, buyer);
  if (asset.owner !== l.lister || !asset.freezeDelegate?.frozen) throw new Error("listing stale onchain");
  const b = new PublicKey(buyer);
  return buildTx(b, [SystemProgram.transfer({ fromPubkey: b, toPubkey: new PublicKey(l.lister), lamports: l.askLamports }), ...ixs], [platformKp]);
}

/** Gacha keep: vault pays lister ask, card thawed + transferred to puller. Server-signed. */
export async function deliverKeep(l: { asset: string; lister: string; askLamports: number }, buyer: string) {
  const { asset, ixs } = await thawAndTransferIxs(l.asset, buyer);
  if (asset.owner !== l.lister || !asset.freezeDelegate?.frozen) throw new Error("listing stale onchain");
  return sendServer([SystemProgram.transfer({ fromPubkey: platformKp.publicKey, toPubkey: new PublicKey(l.lister), lamports: l.askLamports }), ...ixs]);
}

/** Sellback / payouts: plain SOL from vault. */
export const payLamports = (to: string, lamports: number) =>
  sendServer([SystemProgram.transfer({ fromPubkey: platformKp.publicKey, toPubkey: new PublicKey(to), lamports })]);

export async function payBatch(items: { to: string; lamports: number }[]) {
  const sigs: string[] = [];
  for (let i = 0; i < items.length; i += 20) {
    sigs.push(await sendServer(items.slice(i, i + 20).map((x) => SystemProgram.transfer({ fromPubkey: platformKp.publicKey, toPubkey: new PublicKey(x.to), lamports: x.lamports }))));
  }
  return sigs;
}

/** Delist: thaw (also revokes FreezeDelegate) + revoke TransferDelegate. Server-signed; card stays with lister. */
export async function delist(asset: string) {
  const a = await fetchAsset(umi, publicKey(asset));
  const col = await fetchCollection(umi, COLLECTION());
  const res = await thawAsset(umi, { asset: a, collection: col, delegate: umi.identity })
    .add(revokePluginAuthority(umi, { asset: a.publicKey, collection: col.publicKey, plugin: { type: "TransferDelegate" }, authority: umi.identity }))
    .sendAndConfirm(umi);
  return bs58.encode(res.signature);
}
