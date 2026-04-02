// lib/reminderEngine/adaptiveEngine.ts

import { ReminderOccurrence } from "./reminderIntelligence";

export type AdjustmentSuggestion = {
  reminderId: string;
  suggestedShiftMinutes: number;
  reason: string;
};

export function computeAdaptiveAdjustments(params: {
  occurrences: ReminderOccurrence[];
}) {
  const { occurrences } = params;

  const grouped = new Map<string, ReminderOccurrence[]>();

  for (const occ of occurrences) {
    if (!grouped.has(occ.reminderId)) {
      grouped.set(occ.reminderId, []);
    }
    grouped.get(occ.reminderId)!.push(occ);
  }

  const suggestions: AdjustmentSuggestion[] = [];

  for (const [reminderId, occs] of grouped.entries()) {
    const completed = occs.filter((o) => o.status === "completed");

    if (completed.length < 3) continue; // need enough data

    const delays = completed
      .map((o) => o.delayMinutes)
      .filter((d): d is number => d !== null && d !== undefined);

    if (!delays.length) continue;

    const avgDelay =
      delays.reduce((sum, d) => sum + d, 0) / delays.length;

    // 🔥 RULE: consistently late
    if (avgDelay > 10) {
      suggestions.push({
        reminderId,
        suggestedShiftMinutes: Math.round(avgDelay),
        reason: "User consistently completes this reminder late",
      });
    }

    // 🔥 RULE: consistently early (future use)
    if (avgDelay < -5) {
      suggestions.push({
        reminderId,
        suggestedShiftMinutes: Math.round(avgDelay),
        reason: "User consistently completes this reminder early",
      });
    }
  }

  return suggestions;
}