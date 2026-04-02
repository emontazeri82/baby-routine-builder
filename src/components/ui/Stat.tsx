"use client";

import { cn } from "@/lib/utils";

type StatVariant = "default" | "success" | "warning" | "danger" | "info";

type StatProps = {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  description?: string;
  trend?: "up" | "down" | "neutral";
  variant?: StatVariant;
};

export function Stat({
  label,
  value,
  icon,
  description,
  trend,
  variant = "default",
}: StatProps) {
  // 🎯 Auto-derive variant if not explicitly provided
  const computedVariant: StatVariant =
    variant !== "default"
      ? variant
      : trend === "up"
      ? "success"
      : trend === "down"
      ? "danger"
      : "default";

  const variantStyles = {
    default: "bg-white border-neutral-200",
    success: "bg-green-50 border-green-200",
    warning: "bg-yellow-50 border-yellow-200",
    danger: "bg-red-50 border-red-200",
    info: "bg-blue-50 border-blue-200",
  };

  // 🎯 Trend icon + color (VERY IMPORTANT)
  const trendConfig =
    trend === "up"
      ? { icon: "📈", color: "text-green-600" }
      : trend === "down"
      ? { icon: "📉", color: "text-red-500" }
      : trend === "neutral"
      ? { icon: "➖", color: "text-neutral-400" }
      : null;

  return (
    <div
      className={cn(
        "group rounded-xl border p-4 transition-all shadow-sm",
        "hover:shadow-md hover:-translate-y-[2px]",
        variantStyles[computedVariant]
      )}
    >
      {/* 🔹 Top Row */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
          {label}
        </div>

        {icon && <div className="text-lg opacity-80">{icon}</div>}
      </div>

      {/* 🔹 Value + Trend */}
      <div className="mt-2 flex items-end gap-2">
        <div className="text-2xl font-bold text-neutral-900">
          {value}
        </div>

        {trendConfig && (
          <span className={cn("text-sm", trendConfig.color)}>
            {trendConfig.icon}
          </span>
        )}
      </div>

      {/* 🔹 Description */}
      {description && (
        <div className="mt-1 text-xs text-neutral-500">
          {description}
        </div>
      )}
    </div>
  );
}