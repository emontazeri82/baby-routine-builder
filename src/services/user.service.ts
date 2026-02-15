import { db } from "@/lib/db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export async function getUserByEmail(email: string) {
  return db.select().from(users).where(eq(users.email, email));
}
