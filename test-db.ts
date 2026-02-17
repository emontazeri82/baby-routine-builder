require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");

async function testDb() {
  try {
    console.log("DATABASE_URL =", process.env.DATABASE_URL);

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const client = await pool.connect();
    console.log("✅ Connected to database successfully!");
    await client.release();
    await pool.end();
  } catch (err) {
    console.error("❌ DB connection failed:");
    console.error(err);
  }
}

testDb();

