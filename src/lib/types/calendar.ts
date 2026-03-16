// src/lib/types/calendar.ts

export type CalendarEventType = "activity" | "reminder";

export type CalendarEvent = {
  id: string;
  type: CalendarEventType;

  babyId: string;

  title: string;
  start: string;
  end?: string;

  activityTypeId?: string | null;
  activityTypeSlug?: string;

  color?: string | null;
  icon?: string | null;

  isActive?: boolean;
  sourceId: string;

  description?: string;

  notes?: string | null;
  status?: "pending" | "completed" | "skipped" | "expired";
  dayKey?: string;
};
