import { redis } from "@/lib/cache/redis";

const REDIS_TIMEOUT_MS = 120;

type CacheOptions<T> = {
  babyId: string;
  scope: string;
  parts?: Array<string | number>;
  ttlSeconds?: number;
  loader: () => Promise<T>;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs = REDIS_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("redis-timeout")), timeoutMs)
    ),
  ]);
}

async function getVersion(babyId: string): Promise<number> {
  try {
    const value = await withTimeout(redis.get<number | string>(`analytics:version:${babyId}`));

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) return parsed;
    }
  } catch {
    // fall through to default version
  }

  return 1;
}

export async function withAnalyticsCache<T>({
  babyId,
  scope,
  parts = [],
  ttlSeconds = 120,
  loader,
}: CacheOptions<T>): Promise<T> {
  const version = await getVersion(babyId);
  const suffix = parts.join(":");
  const key =
    suffix.length > 0
      ? `analytics:${scope}:${babyId}:${suffix}:v${version}`
      : `analytics:${scope}:${babyId}:v${version}`;

  try {
    const cached = await withTimeout(redis.get<T>(key));
    if (cached !== null && cached !== undefined) {
      return cached;
    }
  } catch {
    // ignore cache read failures and compute fresh
  }

  const fresh = await loader();

  void withTimeout(
    redis.set(key, fresh, { ex: ttlSeconds })
  ).catch(() => {
    // ignore cache write failures
  });

  return fresh;
}

export async function bumpAnalyticsCacheVersion(babyId: string): Promise<void> {
  void withTimeout(redis.incr(`analytics:version:${babyId}`)).catch(() => {
    // ignore version bump failures
  });
}
