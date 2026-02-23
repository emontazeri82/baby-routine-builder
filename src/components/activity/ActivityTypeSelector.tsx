"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useParams } from "next/navigation";
import { ACTIVITY_TYPES } from "@/lib/activityTypes";

type Mode = "activity" | "reminder";

type Props = {
  mode: Mode;
};

export default function ActivityTypeSelector({ mode }: Props) {
  const params = useParams();
  const babyId = params.babyId as string;

  const basePath =
    mode === "activity"
      ? `/dashboard/babies/${babyId}/activities/new`
      : `/dashboard/babies/${babyId}/reminders/new`;

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-semibold mb-8">
        {mode === "activity" ? "Select Activity" : "Select Reminder Type"}
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {ACTIVITY_TYPES.map((type) => (
          <Card
            key={type.slug}
            className="hover:shadow-md transition p-0"
          >
            <Button
              asChild
              variant="ghost"
              className="w-full h-24 text-lg rounded-xl"
            >
              <Link href={`${basePath}/${type.slug}`}>
                {type.name}
              </Link>
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
