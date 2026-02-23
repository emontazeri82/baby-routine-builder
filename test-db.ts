import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { Pool } from "pg";

async function testConnection() {
  console.log("🌍 DATABASE_URL =", process.env.DATABASE_URL);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const res = await pool.query("SELECT NOW()");
  console.log("✅ Connected:", res.rows[0]);
  process.exit(0);
}

testConnection().catch(console.error);
