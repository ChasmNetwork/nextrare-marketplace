import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export const db = drizzle({
  connection: { url: process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "file:local.db", authToken: process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN },
  schema,
});
export * from "./schema";
