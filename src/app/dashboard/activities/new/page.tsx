"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const activityRoutes = [
  { name: "Feeding", slug: "feeding" },
  { name: "Nap", slug: "nap" },
  { name: "Sleep", slug: "sleep" },
  { name: "Diaper", slug: "diaper" },
  { name: "Play", slug: "play" },
  { name: "Medicine", slug: "medicine" },
  { name: "Bath", slug: "bath" },
  { name: "Temperature", slug: "temperature" },
  { name: "Growth", slug: "growth" },
  { name: "Pumping", slug: "pumping" },
];

export default function ActivityTypeSelector() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-semibold mb-8">
        Select Activity
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {activityRoutes.map((type) => (
          <Card
            key={type.slug}
            className="hover:shadow-md transition p-0"
          >
            <Button
              asChild
              variant="ghost"
              className="w-full h-24 text-lg rounded-xl"
            >
              <Link
                href={`/dashboard/activities/new/${type.slug}`}
              >
                {type.name}
              </Link>
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

