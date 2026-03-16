import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { activities, activityTypes, babies } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

import { processActivity } from "@/lib/activityProcessors/processActivityRouter";
import { runInsightProcessors } from "@/lib/insights";

import {
  FeedingMetadataSchema,
  NapMetadataSchema,
  SleepMetadataSchema,
  DiaperMetadataSchema,
  PlayMetadataSchema,
  MedicineMetadataSchema,
  BathMetadataSchema,
  TemperatureMetadataSchema,
  GrowthMetadataSchema,
  PumpingMetadataSchema,
} from "@/lib/activitySchemas";

import { processGrowthMetadata } from "@/lib/metadataProcessors/growthProcessor";

/* ---------------- Base Schema ---------------- */

const BaseActivitySchema = z.object({
  babyId: z.string().uuid(),
  activityTypeName: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  metadata: z.unknown(),
  notes: z.string().optional(),
});

/* ---------------- Activity Time Rules ---------------- */

const ActivityTimeRules: Record<
  string,
  { requiresEndTime: boolean }
> = {
  Sleep: { requiresEndTime: true },
  Nap: { requiresEndTime: true },
  Play: { requiresEndTime: true },
  Pumping: { requiresEndTime: true },

  Feeding: { requiresEndTime: false },
  Growth: { requiresEndTime: false },
  Medicine: { requiresEndTime: false },
  Temperature: { requiresEndTime: false },
  Diaper: { requiresEndTime: false },
  Bath: { requiresEndTime: false },
};

/* ---------------- POST ---------------- */

export async function POST(req: Request) {
  try {

    /* ---------------- Auth ---------------- */

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    /* ---------------- Parse Body ---------------- */

    const body = await req.json();
    const parsed = BaseActivitySchema.safeParse(body);

    console.log("ACTIVITY POST BODY:", body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let { babyId, activityTypeName, startTime, endTime, metadata, notes } =
      parsed.data;

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
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    /* ---------------- Get Activity Type ---------------- */

    const type = await db
      .select()
      .from(activityTypes)
      .where(eq(activityTypes.name, activityTypeName))
      .then((res) => res[0]);

    if (!type) {
      return NextResponse.json(
        { error: "Invalid activity type" },
        { status: 400 }
      );
    }

    /* ---------------- Strict Metadata Validation ---------------- */

    try {

      switch (type.name) {

        case "Feeding":
          metadata = FeedingMetadataSchema.parse(metadata);
          break;

        case "Nap":
          metadata = NapMetadataSchema.parse(metadata);
          break;

        case "Sleep":
          metadata = SleepMetadataSchema.parse(metadata);
          break;

        case "Diaper":
          metadata = DiaperMetadataSchema.parse(metadata);
          break;

        case "Play":
          metadata = PlayMetadataSchema.parse(metadata);
          break;

        case "Medicine":
          metadata = MedicineMetadataSchema.parse(metadata);
          break;

        case "Bath":
          metadata = BathMetadataSchema.parse(metadata);
          break;

        case "Temperature":
          metadata = TemperatureMetadataSchema.parse(metadata);
          break;

        case "Growth":
          metadata = processGrowthMetadata(metadata);
          break;

        case "Pumping":
          metadata = PumpingMetadataSchema.parse(metadata);
          break;

        default:
          return NextResponse.json(
            { error: "Unsupported activity type" },
            { status: 400 }
          );
      }

    } catch (err: unknown) {

      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: err.flatten() },
          { status: 400 }
        );
      }

      if (err instanceof Error) {
        return NextResponse.json(
          { error: err.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Invalid metadata payload" },
        { status: 400 }
      );
    }

    /* ---------------- Feeding Intake Normalization ---------------- */

    if (type.name === "Feeding") {

      const meta = metadata as any;
      const { amount, unit } = meta;

      let intakeMl: number | null = null;

      if (typeof amount === "number") {

        if (unit === "ml") intakeMl = amount;

        if (unit === "oz") intakeMl = amount * 29.5735;
      }

      meta.intakeMl = intakeMl;
    }

    /* ---------------- Time Validation ---------------- */

    const start = new Date(startTime);

    if (isNaN(start.getTime())) {
      return NextResponse.json(
        { error: "Invalid start time" },
        { status: 400 }
      );
    }

    const babyTimezone = baby[0].timezone || "UTC";

    const now = new Date(
      new Date().toLocaleString("en-US", {
        timeZone: babyTimezone,
      })
    );

    if (start > now) {
      return NextResponse.json(
        { error: "Activities cannot be created in the future" },
        { status: 400 }
      );
    }

    let end: Date | null = null;

    const rules = ActivityTimeRules[type.name];

    if (!rules) {
      return NextResponse.json(
        { error: "Missing time rules for activity type" },
        { status: 500 }
      );
    }

    if (rules.requiresEndTime || endTime) {

      if (!endTime) {
        return NextResponse.json(
          { error: "End time is required for this activity" },
          { status: 400 }
        );
      }

      end = new Date(endTime);

      if (isNaN(end.getTime())) {
        return NextResponse.json(
          { error: "Invalid end time" },
          { status: 400 }
        );
      }

      if (end <= start) {
        return NextResponse.json(
          { error: "End time must be after start time" },
          { status: 400 }
        );
      }

      if (end > now) {
        return NextResponse.json(
          { error: "End time cannot be in the future" },
          { status: 400 }
        );
      }
    }

    /* ---------------- Insert Activity ---------------- */

    const inserted = await db
      .insert(activities)
      .values({
        babyId,
        activityTypeId: type.id,
        startTime: start,
        endTime: end,
        durationMinutes:
          end && start
            ? Math.round(
                (end.getTime() - start.getTime()) / 60000
              )
            : null,
        metadata,
        notes,
        createdBy: session.user.id,
      })
      .returning();

    const activity = inserted[0];

    /* ---------------- Run Activity Processors ---------------- */

    processActivity({
      type: type.name.toLowerCase(),
      metadata,
      activityId: activity.id,
      babyId,
    }).catch(console.error);

    runInsightProcessors({
      babyId,
      activityId: activity.id,
      expireStale: true,
    }).catch(console.error);

    /* ---------------- Response ---------------- */

    return NextResponse.json(activity, { status: 201 });

  } catch (error) {

    console.error("CREATE ACTIVITY ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
