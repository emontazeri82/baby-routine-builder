"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2", className)}
      classNames={{
        months: "flex flex-col space-y-4",
        month: "space-y-4",
        caption: "flex justify-between items-center",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        nav_button: "h-7 w-7 rounded-md border hover:bg-muted",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "text-xs w-8 text-center text-muted-foreground",
        row: "flex w-full mt-2",
        cell: "w-8 h-8 text-center text-sm p-0 relative",
        day: "h-8 w-8 rounded-md hover:bg-muted",
        day_selected:
          "bg-blue-500 text-white hover:bg-blue-600",
        day_today: "border border-blue-500",
        day_outside: "text-muted-foreground opacity-50",
        ...classNames,
      }}
      {...props}
    />
  );
}