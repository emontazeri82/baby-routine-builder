"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useParams, useRouter, useSearchParams } from "next/navigation";

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
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const babyId = params.babyId as string;
  const query = searchParams.toString();
  const querySuffix = query ? `?${query}` : "";
  const activityTypeId = searchParams.get("activityTypeId");
  const [isResolvingType, setIsResolvingType] = useState(Boolean(activityTypeId));

  useEffect(() => {
    if (!activityTypeId) return;
    const typeId = activityTypeId;

    let cancelled = false;

    async function resolveAndRedirect() {
      try {
        const res = await fetch(
          `/api/activity-types/resolve?babyId=${encodeURIComponent(
            babyId
          )}&activityTypeId=${encodeURIComponent(typeId)}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          if (!cancelled) setIsResolvingType(false);
          return;
        }

        const data = (await res.json()) as { slug?: string };
        if (!data.slug) {
          if (!cancelled) setIsResolvingType(false);
          return;
        }

        const forwarded = new URLSearchParams(searchParams.toString());
        const suffix = forwarded.toString();
        router.replace(
          `/dashboard/${babyId}/activities/new/${data.slug}${suffix ? `?${suffix}` : ""}`
        );
      } catch {
        if (!cancelled) setIsResolvingType(false);
      }
    }

    resolveAndRedirect();

    return () => {
      cancelled = true;
    };
  }, [activityTypeId, babyId, router, searchParams]);

  if (isResolvingType) {
    return (
      <div className="min-h-screen p-8">
        <h1 className="text-2xl font-semibold mb-2">
          Opening activity form...
        </h1>
        <p className="text-sm text-muted-foreground">
          Resolving reminder activity type.
        </p>
      </div>
    );
  }

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
                href={`/dashboard/${babyId}/activities/new/${type.slug}${querySuffix}`}
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
