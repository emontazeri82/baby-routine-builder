
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const allowedDays = [7, 14, 30, 60];

export default function RangePresetSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawDays = Number(searchParams.get("days"));
  const currentDays = allowedDays.includes(rawDays) ? rawDays : 7;

  function handleChange(value: string) {
    if (!value) return;

    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("days", value);

    router.push(`?${newParams.toString()}`, { scroll: false });
  }

  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Review Range
        </p>
        <p className="text-xs text-muted-foreground/70">
          Analyze trends over selected period
        </p>
      </div>

      <div className="bg-muted/40 p-1.5 rounded-full shadow-sm">
        <ToggleGroup
          type="single"
          value={String(currentDays)}
          onValueChange={handleChange}
          className="gap-1"
        >
          {allowedDays.map((d) => (
            <ToggleGroupItem
              key={d}
              value={String(d)}
              className="
                px-4 py-1.5 
                rounded-full 
                text-sm font-medium
                transition-all duration-200
                data-[state=on]:bg-primary 
                data-[state=on]:text-primary-foreground
                data-[state=on]:shadow-md
                hover:bg-muted
              "
            >
              {d}d
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}
