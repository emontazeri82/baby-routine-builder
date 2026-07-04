import { NextResponse } from "next/server";

import { cleanupDatabase } from "@/lib/cleanup/database-cleanup";

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  return Boolean(secret) && bearerToken === secret;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await cleanupDatabase();

  return NextResponse.json(summary, {
    status: summary.ok ? 200 : 207,
  });
}
