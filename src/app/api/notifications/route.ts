import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { babies } from "@/lib/db/schema";

import {
  getNotificationsForBaby,
  markExpiredNotificationsAsRead,
} from "@/lib/reminders";

import { withNotificationCache } from "@/lib/cache";

/* =========================
   🔐 VALIDATION
========================= */

const querySchema = z.object({
  babyId: z.string().uuid(),
});

/* =========================
   🚨 ERROR HELPER
========================= */

function notificationError(params: {
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

/* =========================
   🛡 SAFE RUNNER (NON-BLOCKING)
========================= */

async function safeRun(
  label: string,
  fn: () => Promise<unknown>,
  timeoutMs = 2000 // ⬅️ shorter for performance
) {
  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs)
      ),
    ]);
  } catch (err) {
    console.error(`❌ ${label} failed`, err);
  }
}

/* =========================
   🚀 GET
========================= */

export async function GET(req: Request) {
  const startTime = Date.now();

  try {
    /* =========================
       🔐 AUTH
    ========================= */

    const session = await auth();

    if (!session?.user?.id) {
      return notificationError({
        httpStatus: 401,
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      });
    }

    /* =========================
       🔎 QUERY VALIDATION
    ========================= */

    const url = new URL(req.url);

    const parsed = querySchema.safeParse({
      babyId: url.searchParams.get("babyId"),
    });

    if (!parsed.success) {
      return notificationError({
        httpStatus: 400,
        code: "INVALID_QUERY",
        message: "Invalid notifications query.",
        details: parsed.error.flatten(),
      });
    }

    const babyId = parsed.data.babyId;

    /* =========================
       🔒 OWNERSHIP CHECK
    ========================= */

    const owned = await db
      .select({ id: babies.id })
      .from(babies)
      .where(
        and(
          eq(babies.id, babyId),
          eq(babies.userId, session.user.id)
        )
      )
      .limit(1);

    if (!owned.length) {
      return notificationError({
        httpStatus: 403,
        code: "FORBIDDEN",
        message: "Forbidden",
      });
    }

    // ✅ Cleanup expired notifications (non-blocking)
    await safeRun("cleanupExpiredNotifications", () =>
      markExpiredNotificationsAsRead({
        babyId,
        userId: session.user.id,
      })
    );

    /* =========================
       📬 FETCH NOTIFICATIONS (CACHED)
    ========================= */

    let result: { notifications: unknown[]; unreadCount: number } = {
      notifications: [],
      unreadCount: 0,
    };

    try {
      const data = await withNotificationCache({
        babyId,
        userId: session.user.id,
        scope: "list",

        ttlSeconds: 30,
        staleWhileRevalidate: true,

        loader: async () => {
          return await getNotificationsForBaby({
            babyId,
            userId: session.user.id,
          });
        },
      });

      if (
        data &&
        typeof data === "object" &&
        "notifications" in data &&
        Array.isArray((data as { notifications?: unknown }).notifications)
      ) {
        result = {
          notifications: (data as { notifications: unknown[] }).notifications,
          unreadCount:
            typeof (data as { unreadCount?: unknown }).unreadCount === "number"
              ? (data as { unreadCount: number }).unreadCount
              : 0,
        };
      }
    } catch (err) {
      console.error("❌ getNotifications failed", err);
    }

    /* =========================
       📊 DEBUG (VERY HELPFUL)
    ========================= */

    console.log("📬 Notifications API", {
      babyId,
      count: result.notifications.length,
      unread: result.unreadCount,
      durationMs: Date.now() - startTime,
    });

    /* =========================
       ✅ RESPONSE
    ========================= */

    return NextResponse.json(result);
  } catch (error) {
    console.error("🔴 Notifications GET fatal error:", error);

    return notificationError({
      httpStatus: 500,
      code: "NOTIFICATIONS_FETCH_FAILED",
      message: "Failed to load notifications",
    });
  }
}