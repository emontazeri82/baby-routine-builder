"use client";

import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreVertical } from "lucide-react";
import BabyActions from "./BabyActions";

import type { Baby } from "@/lib/types/baby";

export default function BabyCard({ baby }: { baby: Baby }) {
  const ageText = baby.birthDate
    ? formatDistanceToNow(new Date(baby.birthDate), { addSuffix: false })
    : "Unknown";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ duration: 0.35 }}
      className="relative group"
    >
      {/* 🌈 Glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-transparent to-pink-500/10 blur-xl opacity-0 group-hover:opacity-100 transition duration-500" />

      <Card className="relative overflow-visible p-5 rounded-2xl border border-white/20 backdrop-blur-xl bg-white/70 dark:bg-white/5 shadow-md group-hover:shadow-xl transition-all duration-300">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar baby={baby} />

            <div>
              <h3 className="font-semibold text-lg text-neutral-800 dark:text-white">
                {baby.name}
              </h3>

              <p className="text-sm text-neutral-500">
                {ageText === "Unknown" ? ageText : `${ageText} old`}
              </p>
            </div>
          </div>

            <BabyActions babyId={baby.id} />
        </div>

        {/* BADGES */}
        <div className="mt-4 flex flex-wrap gap-2">
          {baby.gender && (
            <Badge
              variant="outline"
              className="capitalize border-indigo-200 text-indigo-600"
            >
              {baby.gender}
            </Badge>
          )}

          {baby.birthDate && (
            <Badge className="bg-gradient-to-r from-indigo-500 to-pink-500 text-white">
              Born{" "}
              {new Date(baby.birthDate).toLocaleDateString()}
            </Badge>
          )}
        </div>

        {/* Animated underline */}
        <motion.div
          className="h-[2px] bg-gradient-to-r from-indigo-400 to-pink-400 mt-4 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: "60%" }}
          transition={{ duration: 0.5 }}
        />
      </Card>
    </motion.div>
  );
}

/* ---------- Avatar ---------- */

function Avatar({ baby }: { baby: Baby }) {
  if (baby.photoUrl) {
    return (
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400 to-pink-400 blur-[6px] opacity-40" />
        <img
          src={baby.photoUrl}
          alt={baby.name}
          className="relative w-12 h-12 rounded-full object-cover border-2 border-white"
        />
      </div>
    );
  }

  return (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400 flex items-center justify-center text-white font-semibold shadow-md">
      {baby.name?.[0] || "👶"}
    </div>
  );
}
