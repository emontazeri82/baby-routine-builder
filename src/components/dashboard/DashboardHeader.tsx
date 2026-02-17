"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Bell, Plus, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { useEffect, useState } from "react";

type Baby = {
  id: string;
  name: string;
};

interface DashboardHeaderProps {
  userName?: string | null;
  babies: Baby[];
  selectedBabyId?: string | null;
  onBabyChange?: (id: string) => void;
}

export default function DashboardHeader({
  userName,
  babies,
  selectedBabyId,
  onBabyChange,
}: DashboardHeaderProps) {
  
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(format(new Date(), "EEEE, MMMM d"));
  }, []);


  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col md:flex-row md:items-center md:justify-between gap-6"
    >
      {/* LEFT SIDE */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">
          {greeting}
          {userName && `, ${userName}`} 👋
        </h1>

        <p className="text-neutral-500 text-sm">
          {today}
        </p>

        <div className="flex gap-2 mt-2">
          <Badge variant="secondary">
            {babies.length} Babies
          </Badge>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-3">

        {/* Baby Switcher */}
        {babies.length > 0 && (
          <div className="w-48">
            <Select
              value={selectedBabyId || babies[0].id}
              onChange={(value) => onBabyChange?.(value)}
              options={babies.map((b) => ({
                label: b.name,
                value: b.id,
              }))}
            />
          </div>
        )}

        {/* Quick Add */}
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Activity
        </Button>

        {/* Notifications */}
        <Button size="icon" variant="ghost">
          <Bell className="w-5 h-5" />
        </Button>

        {/* Profile */}
        <Button size="icon" variant="ghost">
          <UserCircle2 className="w-6 h-6" />
        </Button>
      </div>
    </motion.div>
  );
}
