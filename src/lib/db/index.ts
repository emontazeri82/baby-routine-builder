import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = global as unknown as {
  pool: Pool | undefined;
};

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Keep pool small in dev to avoid exhausting Neon connection limits.
    max: process.env.NODE_ENV === "production" ? 10 : 3,
    idleTimeoutMillis: 30000,
    // Fail fast to avoid dashboard SSR "freezing" on bad network hops.
    connectionTimeoutMillis: 8000,
    // Hard guards so individual statements cannot hang for long.
    query_timeout: 8000,
    statement_timeout: 8000,
    idle_in_transaction_session_timeout: 10000,
    maxUses: 5000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    allowExitOnIdle: true,
    ssl: {
      rejectUnauthorized: false,
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

pool.on("error", (err) => {
  console.error("[DB POOL ERROR]", err);
});

export const db = drizzle(pool);
