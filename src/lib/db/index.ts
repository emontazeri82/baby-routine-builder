import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

console.log("DB INIT → DATABASE_URL:", process.env.DATABASE_URL);

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql);
