import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { activities, activityTypes, babies } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
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
import { getActivityCompleteness } from "@/lib/activityCompleteness";
import { ACTIVITY_CONFIG } from "@/lib/activityConfig";

/* ---------------- Base Schema ---------------- */

const BaseActivitySchema = z.object({
  babyId: z.string().uuid(),
  activityTypeName: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  notes: z.string().optional(),
  mode: z.enum(["quick", "full"]).optional(),
});

/* ---------------- POST ---------------- */

export async function POST(req: Request) {
  try {
    /* ---------------- Auth ---------------- */

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ---------------- Parse ---------------- */

    const body = await req.json();
    const parsed = BaseActivitySchema.safeParse(body);

    console.log("ACTIVITY POST BODY:", body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let {
      babyId,
      activityTypeName,
      startTime,
      endTime,
      metadata,
      notes,
      mode,
    } = parsed.data;

    const isQuick = mode === "quick";

    /* ---------------- Activity Config ---------------- */

    const config = ACTIVITY_CONFIG[activityTypeName];

    if (!config) {
      return NextResponse.json(
        { error: "Invalid activity config" },
        { status: 400 }
      );
    }

    /* ---------------- Instant Handling ---------------- */

    if (!config.isDuration) {
      endTime = startTime;
    }

    /* ---------------- Verify Baby ---------------- */

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

    /* ---------------- Prevent Duplicate Active ---------------- */

    if (config.isDuration) {
      const existing = await db
        .select()
        .from(activities)
        .where(
          and(
            eq(activities.babyId, babyId),
            eq(activities.activityTypeId, type.id),
            isNull(activities.endTime)
          )
        )
        .limit(1);

      if (existing.length) {
        return NextResponse.json(
          { error: `${type.name} already active` },
          { status: 400 }
        );
      }
    }

    /* ---------------- Metadata Handling ---------------- */

    try {
      let meta: Record<string, any> =
        typeof metadata === "object" && metadata !== null
          ? metadata
          : {};

      // ✅ APPLY CONFIG DEFAULTS
      if (isQuick && config.quickMetadata) {
        meta = {
          ...config.quickMetadata(),
          ...meta,
        };
      }

      // ✅ Special processing
      if (type.name === "Growth" && !isQuick) {
        meta = processGrowthMetadata(meta);
      }

      metadata = meta;

      // ✅ STRICT VALIDATION (only for full mode)
      if (!isQuick) {
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
        { error: "Invalid metadata" },
        { status: 400 }
      );
    }

    /* ---------------- Time Validation ---------------- */

    const start = new Date(startTime);

    if (isNaN(start.getTime())) {
      return NextResponse.json(
        { error: "Invalid start time" },
        { status: 400 }
      );
    }

    const now = new Date();

    if (start > now) {
      return NextResponse.json(
        { error: "Cannot log future activity" },
        { status: 400 }
      );
    }

    let end: Date | null = null;

    if (endTime) {
      end = new Date(endTime);

      if (isNaN(end.getTime())) {
        return NextResponse.json(
          { error: "Invalid end time" },
          { status: 400 }
        );
      }

      if (end.getTime() < start.getTime()) {
        return NextResponse.json(
          { error: "End before start" },
          { status: 400 }
        );
      }

      if (end > now) {
        return NextResponse.json(
          { error: "End in future" },
          { status: 400 }
        );
      }
    }

    /* ---------------- Insert ---------------- */

    let dataCompleteness: string;

    if (isQuick) {
      dataCompleteness = "partial";
    } else {
      dataCompleteness =
        getActivityCompleteness(type.name, metadata, end) || "partial";
    }

    const inserted = await db
      .insert(activities)
      .values({
        babyId,
        activityTypeId: type.id,
        startTime: start,
        endTime: end,
        durationMinutes:
          end && start
            ? Math.round((end.getTime() - start.getTime()) / 60000)
            : null,
        metadata,
        notes,
        dataCompleteness,
        createdBy: session.user.id,
      })
      .returning();

    const activity = inserted[0];

    /* ---------------- Background Jobs ---------------- */

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

    return NextResponse.json(activity, { status: 201 });

  } catch (error) {
    console.error("CREATE ACTIVITY ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
