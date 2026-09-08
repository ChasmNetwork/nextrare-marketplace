import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const listings = sqliteTable("listings", {
  id: text().primaryKey(),
  asset: text().notNull().unique(),
  lister: text().notNull(),
  name: text().notNull(),
  imageUri: text("image_uri").notNull(),
  askLamports: integer("ask_lamports").notNull(),
  packId: text("pack_id").notNull(),
  // active | pending_buy | reserved | sold | pulled | delisted
  status: text().notNull().default("active"),
  pendingUntil: integer("pending_until"),
  listSig: text("list_sig"),
  soldSig: text("sold_sig"),
  buyer: text(),
  // JSON {buyer, messageHash, blockhash, lastValidBlockHeight} while pending_buy
  pending: text(),
  createdAt: integer("created_at").notNull(),
});

export const pulls = sqliteTable("pulls", {
  id: text().primaryKey(),
  packId: text("pack_id").notNull(),
  buyer: text().notNull(),
  priceLamports: integer("price_lamports").notNull(),
  // JSON snapshot of active {id, ask, lister}[] at build time so the roll is reproducible
  snapshot: text().notNull(),
  messageHash: text("message_hash"),
  paymentSig: text("payment_sig"),
  commitHash: text("commit_hash").notNull(),
  revealSecret: text("reveal_secret").notNull(),
  blockhash: text(),
  lastValidBlockHeight: integer("last_valid_block_height"),
  provider: text().notNull().default("commit"),
  vrfAccount: text("vrf_account"),
  roll: text(),
  wonListingId: text("won_listing_id"),
  decisionDeadline: integer("decision_deadline"),
  // built | paid | revealed | kept | sold_back | failed
  status: text().notNull().default("built"),
  settleSig: text("settle_sig"),
  createdAt: integer("created_at").notNull(),
});

export const yieldLedger = sqliteTable("yield_ledger", {
  id: text().primaryKey(),
  packId: text("pack_id").notNull(),
  pullId: text("pull_id").notNull(),
  listingId: text("listing_id").notNull(),
  lister: text().notNull(),
  shareBps: integer("share_bps").notNull(),
  amountLamports: integer("amount_lamports").notNull(),
  payoutId: text("payout_id"),
  createdAt: integer("created_at").notNull(),
});

export const payouts = sqliteTable("payouts", {
  id: text().primaryKey(),
  period: text().notNull(),
  lister: text().notNull(),
  amountLamports: integer("amount_lamports").notNull(),
  sig: text(),
  createdAt: integer("created_at").notNull(),
});

/** Judge metric: one row per wallet that ever connected, so a visitor counts even before they transact. */
export const users = sqliteTable("users", {
  wallet: text().primaryKey(),
  // ?ref= tag on the link they arrived through (event, tg, x, judge…)
  ref: text(),
  firstSeen: integer("first_seen").notNull(),
  lastSeen: integer("last_seen").notNull(),
  visits: integer().notNull().default(1),
});

export const feedback = sqliteTable("feedback", {
  id: text().primaryKey(),
  wallet: text(),
  // 1-5: "would you use this for real cards?"
  score: integer().notNull(),
  // collector | seller | both | curious
  role: text(),
  note: text(),
  ref: text(),
  createdAt: integer("created_at").notNull(),
});

/** Waitlist: interest from people who won't install a wallet at a hackathon booth. */
export const waitlist = sqliteTable("waitlist", {
  id: text().primaryKey(),
  // email, @tg handle or @x handle — whatever they typed
  contact: text().notNull(),
  role: text(),
  note: text(),
  ref: text(),
  createdAt: integer("created_at").notNull(),
});
