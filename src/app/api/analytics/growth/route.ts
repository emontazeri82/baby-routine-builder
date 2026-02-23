// app/api/analytics/growth/route.ts

import { NextRequest, NextResponse } from "next/server";
import { validate as uuidValidate } from "uuid";
import {
  fetchGrowthMeasurements,
  computeGrowthAnalytics,
} from "@/lib/utils/analytics/growth";

const GROWTH_ACTIVITY_TYPE_ID = process.env.GROWTH_ACTIVITY_TYPE_ID!;

export async function GET(req: NextRequest) {
  try {
    const babyId = req.nextUrl.searchParams.get("babyId");

    /* ============================= */
    /*        VALIDATION LAYER       */
    /* ============================= */

    if (!babyId) {
      return NextResponse.json(
        { error: "babyId is required" },
        { status: 400 }
      );
    }

    if (!uuidValidate(babyId)) {
      return NextResponse.json(
        { error: "Invalid babyId format" },
        { status: 400 }
      );
    }

    if (!GROWTH_ACTIVITY_TYPE_ID) {
      console.error("Missing GROWTH_ACTIVITY_TYPE_ID env variable");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    /* ============================= */
    /*        DATA LAYER             */
    /* ============================= */

    const rawRows = await fetchGrowthMeasurements(
      babyId,
      GROWTH_ACTIVITY_TYPE_ID
    );

    /* ============================= */
    /*        ANALYTICS LAYER        */
    /* ============================= */

    const analytics = computeGrowthAnalytics(rawRows);

    return NextResponse.json(
      {
        success: true,
        count: analytics.length,
        data: analytics,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Growth Analytics Error]", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
