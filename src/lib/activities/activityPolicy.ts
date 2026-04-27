// src/lib/activity/policy.ts

export const REQUIRE_DURATION_TYPES = [
  "sleep",
  "nap",
  "bath",
  "play",
  "pumping",
] as const;

export function requiresDetails(slug: string): boolean {
  return REQUIRE_DURATION_TYPES.includes(
    slug as (typeof REQUIRE_DURATION_TYPES)[number]
  );
}