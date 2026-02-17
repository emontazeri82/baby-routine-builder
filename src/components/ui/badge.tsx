import * as React from "react";
import { cn } from "@/lib/utils/cn";

/* ✅ Define variants first */
const badgeVariants = {
  default: "bg-neutral-900 text-white",
  secondary: "bg-neutral-100 text-neutral-800",
  success: "bg-green-100 text-green-700",
  destructive: "bg-red-100 text-red-700",
  outline:
    "border border-neutral-300 text-neutral-700 bg-transparent",
  ghost:
    "text-neutral-600 bg-transparent hover:bg-neutral-100 transition-colors",
} as const;

/* ✅ Automatically derive type from object keys */
type BadgeVariant = keyof typeof badgeVariants;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}
