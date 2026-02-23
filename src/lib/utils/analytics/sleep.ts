// lib/utils/analytics/sleep.ts

export function calculateNightOverlap(
  start: Date,
  end: Date
): number {
  if (end <= start) return 0;

  let totalNightMinutes = 0;
  let cursor = new Date(start);

  while (cursor < end) {
    const nightStart = new Date(cursor);
    nightStart.setUTCHours(19, 0, 0, 0);

    const nightEnd = new Date(nightStart);
    nightEnd.setUTCDate(nightEnd.getUTCDate() + 1);
    nightEnd.setUTCHours(5, 0, 0, 0);

    const overlapStart = new Date(
      Math.max(start.getTime(), nightStart.getTime())
    );

    const overlapEnd = new Date(
      Math.min(end.getTime(), nightEnd.getTime())
    );

    if (overlapEnd > overlapStart) {
      totalNightMinutes +=
        (overlapEnd.getTime() - overlapStart.getTime()) / 60000;
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return totalNightMinutes;
}
