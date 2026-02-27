import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { activities, activityTypes, babies } from "@/lib/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { generateDiaperAnalytics } from "@/lib/utils/analytics/diaper";

function zonedDateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const babyId = searchParams.get("babyId");
    const daysParam = searchParams.get("days");

    if (!babyId) {
      return NextResponse.json({ error: "Missing babyId" }, { status: 400 });
    }

    const parsedDays = parseInt(daysParam || "60", 10);
    const days = Number.isFinite(parsedDays) && parsedDays > 0 && parsedDays <= 60
      ? parsedDays
      : 60;


    /* ---------------- Verify Baby Ownership ---------------- */

    const baby = await db
      .select()
      .from(babies)
      .where(
        and(
          eq(babies.id, babyId),
          eq(babies.userId, session.user.id)
        )
      )
      .limit(1);

    if (!baby.length) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const babyTimezone = baby[0].timezone || "UTC";

    /* ---------------- Get Diaper Activity Type ---------------- */

    const diaperType = await db
      .select()
      .from(activityTypes)
      .where(eq(activityTypes.name, "Diaper"))
      .then((res) => res[0]);

    if (!diaperType) {
      return NextResponse.json(
        { error: "Diaper activity type not found" },
        { status: 500 }
      );
    }

    /* ---------------- Date Filter ---------------- */

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const now = new Date();
    const allowedDateKeys = new Set<string>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      allowedDateKeys.add(zonedDateKey(d, babyTimezone));
    }

    /* ---------------- Fetch Activities ---------------- */

    const diaperActivities = await db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.babyId, babyId),
          eq(activities.activityTypeId, diaperType.id),
          gte(activities.startTime, since)
        )
      )
      .orderBy(desc(activities.startTime));

    const filteredActivities = diaperActivities.filter((a) =>
      allowedDateKeys.has(
        zonedDateKey(new Date(a.startTime), babyTimezone)
      )
    );

    /* ---------------- Generate Analytics ---------------- */

    const analytics = generateDiaperAnalytics(
      filteredActivities,
      babyTimezone
    );

    if (process.env.NODE_ENV !== "production") {
      console.log("[DIAPER API DEBUG]", {
        babyId,
        days,
        timezone: babyTimezone,
        fetchedCount: diaperActivities.length,
        filteredCount: filteredActivities.length,
        firstFilteredStart:
          filteredActivities[filteredActivities.length - 1]?.startTime ?? null,
        lastFilteredStart: filteredActivities[0]?.startTime ?? null,
        dailyPoints: analytics.daily.length,
        firstDaily: analytics.daily[0] ?? null,
        lastDaily: analytics.daily[analytics.daily.length - 1] ?? null,
      });
    }

    return NextResponse.json(analytics, { status: 200 });

  } catch (error) {
    console.error("DIAPER ANALYTICS ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
