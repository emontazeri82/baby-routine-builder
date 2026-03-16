"use client";

import { useParams } from "next/navigation";

import AddReminderForm from "@/components/reminders/AddReminderForm";

export default function ReminderFormPage() {
  const params = useParams();
  const babyId = params.babyId as string;
  const slug = params.slug as string;
  const isSimple = slug === "simple";

  return (
    <div className="min-h-screen p-8 max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">
        Create {isSimple ? "simple" : slug} reminder
      </h1>
      <p className="text-sm text-neutral-500">
        Reminder definitions are stored in reminders. Completion
        happens per occurrence.
      </p>

      <AddReminderForm
        babyId={babyId}
        initialReminderMode={isSimple ? "simple" : "activity"}
        initialActivityTypeSlug={isSimple ? undefined : slug}
        onSuccessRedirectTo={`/dashboard/${babyId}/reminders`}
      />
    </div>
  );
}
