"use client";

import {
  Lightbulb,
  AlertTriangle,
  Flame,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type Insight = {
  id?: string;
  type?: "activity" | "reminder" | "system";
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  severity?: "info" | "warning" | "strong" | "success";
  timestamp?: string;
};

export default function SmartInsightCard({
  insight,
}: {
  insight: Insight;
}) {
  const severity = insight.severity ?? "info";

  const styles = {
    info: {
      container:
        "bg-blue-50/80 border-blue-200 hover:bg-blue-50",
      icon: "text-blue-500",
      action: "text-blue-700 hover:text-blue-900",
      ring: "ring-blue-200",
    },
    warning: {
      container:
        "bg-amber-50/80 border-amber-200 hover:bg-amber-50",
      icon: "text-amber-500",
      action: "text-amber-700 hover:text-amber-900",
      ring: "ring-amber-200",
    },
    strong: {
      container:
        "bg-red-50/80 border-red-200 hover:bg-red-50",
      icon: "text-red-500",
      action: "text-red-700 hover:text-red-900",
      ring: "ring-red-200",
    },
    success: {
      container:
        "bg-green-50/80 border-green-200 hover:bg-green-50",
      icon: "text-green-500",
      action: "text-green-700 hover:text-green-900",
      ring: "ring-green-200",
    },
  };

  const iconMap = {
    info: <Lightbulb className="h-4 w-4" />,
    warning: <AlertTriangle className="h-4 w-4" />,
    strong: <Flame className="h-4 w-4" />,
    success: <CheckCircle className="h-4 w-4" />,
  };

  return (
    <div
      className={cn(
        "flex gap-3 items-start rounded-xl border p-3",
        "transition-all duration-200 hover:shadow-md",
        "ring-1",
        styles[severity].container,
        styles[severity].ring
      )}
    >
      {/* Icon */}
      <div className={cn("mt-1", styles[severity].icon)}>
        {iconMap[severity]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">
          {insight.title}
        </p>

        {insight.description && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {insight.description}
          </p>
        )}

        {/* Timestamp */}
        {insight.timestamp && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {insight.timestamp}
          </p>
        )}

        {/* Action */}
        {insight.actionLabel && insight.onAction && (
          <button
            onClick={insight.onAction}
            className={cn(
              "mt-2 text-xs font-medium transition underline-offset-2 hover:underline",
              styles[severity].action
            )}
          >
            {insight.actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}