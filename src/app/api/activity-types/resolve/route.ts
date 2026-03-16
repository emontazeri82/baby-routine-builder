import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { activityTypes, babies } from "@/lib/db/schema";

const querySchema = z.object({
  babyId: z.string().uuid(),
  activityTypeId: z.string().uuid(),
});

function errorResponse(params: {
  httpStatus: number;
  code: string;
  message: string;
  details?: unknown;
}) {
  return NextResponse.json(
    {
      status: "error",
      code: params.code,
      message: params.message,
      details: params.details ?? null,
    },
    { status: params.httpStatus }
  );
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse({
      httpStatus: 401,
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    babyId: url.searchParams.get("babyId"),
    activityTypeId: url.searchParams.get("activityTypeId"),
  });

  if (!parsed.success) {
    return errorResponse({
      httpStatus: 400,
      code: "INVALID_QUERY",
      message: "Invalid activity type lookup query.",
      details: parsed.error.flatten(),
    });
  }

  const ownedBaby = await db
    .select({ id: babies.id })
    .from(babies)
    .where(
      and(
        eq(babies.id, parsed.data.babyId),
        eq(babies.userId, session.user.id)
      )
    )
    .limit(1);

  if (!ownedBaby.length) {
    return errorResponse({
      httpStatus: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
  }

  const type = await db
    .select({ id: activityTypes.id, slug: activityTypes.slug })
    .from(activityTypes)
    .where(eq(activityTypes.id, parsed.data.activityTypeId))
    .limit(1);

  if (!type.length) {
    return errorResponse({
      httpStatus: 404,
      code: "ACTIVITY_TYPE_NOT_FOUND",
      message: "Activity type not found",
    });
  }

  return NextResponse.json({
    id: type[0].id,
    slug: type[0].slug,
  });
}
