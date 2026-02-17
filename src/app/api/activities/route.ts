import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { activities, activityTypes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

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

const BaseActivitySchema = z.object({
  babyId: z.string().uuid(),
  activityTypeId: z.string().uuid(),
  startTime: z.string(),
  endTime: z.string().optional(),
  metadata: z.any(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = BaseActivitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { babyId, activityTypeId, startTime, endTime, metadata, notes } =
      parsed.data;

    /* ---------------- Get Activity Type ---------------- */

    const type = await db
      .select()
      .from(activityTypes)
      .where(eq(activityTypes.id, activityTypeId))
      .then((res) => res[0]);

    if (!type) {
      return NextResponse.json(
        { error: "Invalid activity type" },
        { status: 400 }
      );
    }

    /* ---------------- Strict Metadata Validation ---------------- */

    switch (type.name) {
      case "Feeding":
        FeedingMetadataSchema.parse(metadata);
        break;
      case "Nap":
        NapMetadataSchema.parse(metadata);
        break;
      case "Sleep":
        SleepMetadataSchema.parse(metadata);
        break;
      case "Diaper":
        DiaperMetadataSchema.parse(metadata);
        break;
      case "Play":
        PlayMetadataSchema.parse(metadata);
        break;
      case "Medicine":
        MedicineMetadataSchema.parse(metadata);
        break;
      case "Bath":
        BathMetadataSchema.parse(metadata);
        break;
      case "Temperature":
        TemperatureMetadataSchema.parse(metadata);
        break;
      case "Growth":
        GrowthMetadataSchema.parse(metadata);
        break;
      case "Pumping":
        PumpingMetadataSchema.parse(metadata);
        break;
      default:
        return NextResponse.json(
          { error: "Unsupported activity type" },
          { status: 400 }
        );
    }

    /* ---------------- Duration Calculation ---------------- */

    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : null;

    const durationMinutes =
      end && start
        ? Math.round((end.getTime() - start.getTime()) / 60000)
        : null;

    /* ---------------- Insert ---------------- */

    const inserted = await db
      .insert(activities)
      .values({
        babyId,
        activityTypeId,
        startTime: start,
        endTime: end,
        durationMinutes,
        metadata,
        notes,
        createdBy: session.user.id,
      })
      .returning();

    return NextResponse.json(inserted[0], { status: 201 });

  } catch (error) {
    console.error("CREATE ACTIVITY ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
