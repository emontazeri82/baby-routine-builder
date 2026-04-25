import { ACTIVITY_TYPES } from "@/lib/activityTypes";

export type ActivityTypeDisplay = {
  label: string;
  icon: string;
};

/**
 * Resolve friendly label + emoji for reminder/insight copy.
 * Prefers DB name, falls back to static catalog by slug.
 */
export function getActivityTypeDisplay(params: {
  name?: string | null;
  slug?: string | null;
}): ActivityTypeDisplay {
  const name = params.name?.trim();
  if (name) {
    const fromSlug = params.slug
      ? ACTIVITY_TYPES.find((t) => t.slug === params.slug)
      : undefined;
    return {
      label: name,
      icon: fromSlug?.icon ?? "📌",
    };
  }

  if (params.slug) {
    const fromSlug = ACTIVITY_TYPES.find((t) => t.slug === params.slug);
    if (fromSlug) {
      return { label: fromSlug.name, icon: fromSlug.icon ?? "📌" };
    }
  }

  return { label: "Activity", icon: "📌" };
}
