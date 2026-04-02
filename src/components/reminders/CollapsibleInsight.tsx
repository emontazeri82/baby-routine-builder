"use client";

import { useState } from "react";
import { ChevronDown, Lightbulb, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CollapsibleInsight({
  children,
  defaultOpen = true,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-200 bg-amber-50 p-3",
        "shadow-sm transition-all duration-200 hover:shadow-md"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Smart Insight

          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          open ? "max-h-40 mt-3" : "max-h-0"
        )}
      >
        {children}
      </div>
    </div>
  );
}