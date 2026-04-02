import { redis } from "@/lib/cache/redis";

/* =========================
   CONFIG
========================= */

const REDIS_TIMEOUT_MS = 120;
const DEFAULT_TTL = 30; // fast refresh for notifications

/* =========================
   TYPES
========================= */

type CacheOptions<T> = {
  babyId: string;
  userId: string;
  scope: string;
  parts?: Array<string | number>;
  ttlSeconds?: number;

  // 🔥 advanced options
  staleWhileRevalidate?: boolean;
  debug?: boolean;

  loader: () => Promise<T>;
};

/* =========================
   INTERNAL STATE (DEDUP)
========================= */

// Prevent duplicate DB calls (VERY important under load)
const inFlight = new Map<string, Promise<any>>();

/* =========================
   UTILS
========================= */

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = REDIS_TIMEOUT_MS
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("redis-timeout")), timeoutMs)
    ),
  ]);
}

async function getVersion(userId: string, babyId: string): Promise<number> {
  try {
    const value = await withTimeout(
      redis.get<number | string>(`notifications:version:${userId}:${babyId}`)
    );

    if (typeof value === "number" && Number.isFinite(value)) return value;

    if (typeof value === "string") {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) return parsed;
    }
  } catch {}

  return 1;
}

function buildKey(params: {
  userId: string;
  babyId: string;
  scope: string;
  parts: Array<string | number>;
  version: number;
}) {
  const suffix = params.parts.join(":");

  return suffix.length > 0
    ? `notifications:${params.scope}:${params.userId}:${params.babyId}:${suffix}:v${params.version}`
    : `notifications:${params.scope}:${params.userId}:${params.babyId}:v${params.version}`;
}

/* =========================
   MAIN CACHE FUNCTION
========================= */

export async function withNotificationCache<T>({
  babyId,
  userId,
  scope,
  parts = [],
  ttlSeconds = DEFAULT_TTL,
  staleWhileRevalidate = true,
  debug = false,
  loader,
}: CacheOptions<T>): Promise<T> {
  const version = await getVersion(userId, babyId);

  const key = buildKey({
    userId,
    babyId,
    scope,
    parts,
    version,
  });

  /* =========================
     1. TRY CACHE FIRST
  ========================= */

  try {
    const cached = await withTimeout(redis.get<T>(key));

    if (cached !== null && cached !== undefined) {
      if (debug) console.log("⚡ CACHE HIT:", key);

      // 🔥 STALE-WHILE-REVALIDATE
      if (staleWhileRevalidate) {
        refreshInBackground(key, ttlSeconds, loader, debug);
      }

      return cached;
    }
  } catch {
    if (debug) console.log("⚠️ CACHE READ FAILED:", key);
  }

  /* =========================
     2. DEDUP REQUESTS
  ========================= */

  if (inFlight.has(key)) {
    if (debug) console.log("⏳ USING IN-FLIGHT:", key);
    return inFlight.get(key)!;
  }

  const promise = (async () => {
    try {
      if (debug) console.log("🟡 CACHE MISS:", key);

      const fresh = await loader();

      // write cache (non-blocking)
      void withTimeout(redis.set(key, fresh, { ex: ttlSeconds })).catch(() => {
        if (debug) console.log("⚠️ CACHE WRITE FAILED:", key);
      });

      return fresh;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);

  return promise;
}

/* =========================
   BACKGROUND REFRESH
========================= */

function refreshInBackground<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
  debug: boolean
) {
  if (inFlight.has(key)) return;

  const promise = (async () => {
    try {
      if (debug) console.log("🔄 BACKGROUND REFRESH:", key);

      const fresh = await loader();

      await withTimeout(redis.set(key, fresh, { ex: ttlSeconds }));
    } catch {
      if (debug) console.log("⚠️ BACKGROUND REFRESH FAILED:", key);
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
}

/* =========================
   INVALIDATION
========================= */

export async function bumpNotificationCacheVersion(
  userId: string,
  babyId: string
) {
  try {
    await withTimeout(
      redis.incr(`notifications:version:${userId}:${babyId}`)
    );
  } catch {}
}

/* =========================
   OPTIONAL: MANUAL DELETE
========================= */

export async function deleteNotificationCacheKey(key: string) {
  try {
    await withTimeout(redis.del(key));
  } catch {}
}