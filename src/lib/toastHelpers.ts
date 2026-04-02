import { toast } from "@/components/ui/use-toast";

export function showReminderToast(
  action: "complete" | "skip" | "snooze" | "reschedule" | "loading"
) {
  switch (action) {
    case "loading":
      toast({ title: "⏳ Processing reminder..." });
      break;

    case "complete":
      toast({ title: "✅ Reminder completed" });
      break;

    case "skip":
      toast({ title: "⏭ Reminder skipped" });
      break;

    case "snooze":
      toast({ title: "⏰ Snoozed for 10 minutes" });
      break;

    case "reschedule":
      toast({ title: "📅 Reminder rescheduled" });
      break;
  }
}

export function showErrorToast(message: string) {
  toast({
    title: "Error",
    description: message,
    variant: "destructive",
  });
}