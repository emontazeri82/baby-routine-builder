/** Shared shape for the baby activity list (RSC JSON may use ISO strings for times). */
export type ActivityListItem = {
  id: string;
  startTime: Date | string | null;
  endTime: Date | string | null;
  notes: string | null;
  babyId: string;
  activityName: string | null;

  updatedAt: Date | string | null;
};
