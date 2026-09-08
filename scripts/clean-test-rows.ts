import { eq, like } from "drizzle-orm";
import { db, waitlist, feedback } from "../db";
// one-off: drop rows inserted while smoke-testing so the judge numbers stay honest
async function main() {
  const a = await db.delete(waitlist).where(eq(waitlist.contact, "test@nextrare.cards"));
  const b = await db.delete(feedback).where(like(feedback.note, "Rip and instant cash-out%"));
  console.log("deleted waitlist", a.rowsAffected, "feedback", b.rowsAffected);
}
main();
