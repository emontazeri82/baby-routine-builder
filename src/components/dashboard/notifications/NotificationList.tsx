"use client";

import Link from "next/link";
import NotificationItem from "./NotificationItem";
import { isToday } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { AppNotification } from "@/store/notificationSlice";

export default function NotificationList({
  notifications,
  babyId,
  onRefresh,
}: {
  notifications: AppNotification[];
  babyId: string;
  onRefresh?: () => Promise<void> | void;
}) {
  const parseDate = (value?: string) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const unique = new Map<string, AppNotification>();
  notifications.forEach((n) => {
    const key = n.occurrenceId
      ? `${n.reminderId ?? "none"}-${n.occurrenceId}`
      : n.id;
    if (!unique.has(key)) {
      unique.set(key, n);
    }
  });
  const deduped = Array.from(unique.values());

  if (!deduped.length) {
    return (
      <div className="flex flex-col items-center justify-center space-y-2 py-16 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          You are all caught up
        </p>
        <p className="text-xs text-muted-foreground">
          No new notifications right now.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-2">
          <Link href={`/dashboard/${babyId}/reminders`}>View reminders</Link>
        </Button>
      </div>
    );
  }

  const severityOrder: Record<
    AppNotification["severity"],
    number
  > = {
    success: 3,
    critical: 0,
    warning: 1,
    info: 2,
  };

  const isActionable = (n: AppNotification) =>
    n.reminderStatus === "active" && Boolean(n.hasDueOccurrence);
  const isOverdue = (n: AppNotification) => n.currentState === "overdue";

  const sorted = [...deduped].sort((a, b) => {
    if (isActionable(a) !== isActionable(b)) {
      return isActionable(a) ? -1 : 1;
    }
    if (isOverdue(a) !== isOverdue(b)) {
      return isOverdue(a) ? -1 : 1;
    }

    const severityDiff =
      severityOrder[a.severity] -
      severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;

    const createdDiff =
      new Date(b.createdAt ?? 0).getTime() -
      new Date(a.createdAt ?? 0).getTime();
    return createdDiff;
  });

  const today: AppNotification[] = [];
  const earlier: AppNotification[] = [];

  sorted.forEach((n) => {
    const createdAt = parseDate(n.createdAt);
    const scheduledFor = parseDate(n.scheduledFor);

    if (createdAt && isToday(createdAt)) {
      today.push(n);
      return;
    }

    if (scheduledFor && isToday(scheduledFor)) {
      today.push(n);
      return;
    }

    earlier.push(n);
  });

  return (
    <div className="mt-4 space-y-6 pb-6">
      {today.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Today
          </p>
          <div className="space-y-3">
            {today.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                babyId={babyId}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        </div>
      )}

      {earlier.length > 0 && (
        <div>
          <Separator className="mb-4" />
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Earlier
          </p>
          <div className="space-y-3">
            {earlier.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                babyId={babyId}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
