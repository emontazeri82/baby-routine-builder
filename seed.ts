import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { seedActivityTypes } from "./src/lib/db/seed/activityTypes";

async function run() {
  try {
    console.log("🌍 DATABASE_URL =", process.env.DATABASE_URL);
    await seedActivityTypes();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

run();
