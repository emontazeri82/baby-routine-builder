"use client";

import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  disabled?: boolean;
  onCompleteOnly: () => void;
  onCreateActivity: () => void;
  onCancel: () => void;
};

export default function CompleteReminderPrompt({
  open,
  disabled,
  onCompleteOnly,
  onCreateActivity,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="mt-3 rounded-md border bg-muted/30 p-3 text-sm">
      <p className="font-medium">Reminder completed.</p>
      <p className="mt-1 text-muted-foreground">
        Do you want to create an activity from this reminder?
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={disabled} onClick={onCompleteOnly}>
          No, just complete reminder
        </Button>
        <Button size="sm" disabled={disabled} onClick={onCreateActivity}>
          Yes, add activity
        </Button>
        <Button size="sm" variant="ghost" disabled={disabled} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
