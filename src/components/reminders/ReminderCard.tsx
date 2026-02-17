"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

type Reminder = {
  id: string;
  title: string | null;
  nextRun: Date | null;
  isActive: boolean | null;
  cronExpression?: string | null;
};

export default function ReminderCard({
  reminder,
}: {
  reminder: Reminder;
}) {
  const [expanded, setExpanded] = useState(false);

  const next =
    reminder.nextRun &&
    formatDistanceToNow(new Date(reminder.nextRun), {
      addSuffix: true,
    });

  return (
    <motion.div layout>
      <Card className="p-5 hover:shadow-md transition-all">

        <div className="flex justify-between items-start">

          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-lg">
                {reminder.title || "Reminder"}
              </h3>

              {reminder.isActive ? (
                <Badge variant="success">
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">
                  Inactive
                </Badge>
              )}
            </div>

            {next && (
              <p className="text-sm text-neutral-500">
                Next run {next}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">

            <Switch
              checked={!!reminder.isActive}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-500">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </div>

        {/* Expandable Section */}
        <motion.div
          initial={false}
          animate={{ height: expanded ? "auto" : 0 }}
          className="overflow-hidden"
        >
          {expanded && (
            <div className="mt-4 text-sm text-neutral-600">
              <p>
                Cron: {reminder.cronExpression || "Not set"}
              </p>
            </div>
          )}
        </motion.div>

        <div className="mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Hide Details" : "View Details"}
          </Button>
        </div>

      </Card>
    </motion.div>
  );
}
