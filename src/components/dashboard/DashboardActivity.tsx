"use client";

import { Card } from "@/components/ui/card";
import { format, formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { ACTIVITY_ICONS } from "@/lib/activityUI";

/* =========================
   TYPES
========================= */

interface Activity {
  id: string;
  startTime: Date | string | null;
  endTime?: Date | string | null;
  type?: string;
  slug?: string | null;
  duration?: number | null;
  notes?: string | null;
  metadata?: unknown;
}

/* =========================
   UNDERLINE ACCENT (by slug)
========================= */

const SLUG_ACCENT: Record<string, string> = {
  feeding: "bg-blue-400",
  sleep: "bg-indigo-400",
  nap: "bg-purple-400",
  diaper: "bg-yellow-400",
  play: "bg-green-400",
  bath: "bg-cyan-400",
  medicine: "bg-red-400",
  temperature: "bg-orange-400",
  growth: "bg-pink-400",
  pumping: "bg-teal-400",
};

function formatActivitySummary(
  slug: string | null | undefined,
  metadata: unknown
): string {
  if (metadata == null || typeof metadata !== "object") return "";
  const m = metadata as Record<string, unknown>;

  switch (slug) {
    case "feeding": {
      const parts: string[] = [];
      if (typeof m.method === "string" && m.method) parts.push(m.method);
      if (typeof m.amount === "number" && m.amount > 0) {
        const u = typeof m.unit === "string" ? m.unit : "ml";
        parts.push(`${m.amount} ${u}`);
      }
      return parts.join(" · ");
    }
    case "diaper": {
      if (typeof m.type === "string" && m.type) return m.type;
      return "";
    }
    case "play": {
      if (typeof m.playType === "string" && m.playType) {
        return humanizeKey(m.playType);
      }
      if (typeof m.type === "string" && m.type) return humanizeKey(m.type);
      return "";
    }
    case "sleep":
    case "nap": {
      if (typeof m.location === "string" && m.location) return m.location;
      if (typeof m.quality === "string" && m.quality) return m.quality;
      return "";
    }
    case "medicine": {
      const name =
        (typeof m.medicineName === "string" && m.medicineName) ||
        (typeof m.name === "string" && m.name) ||
        (typeof m.medication === "string" && m.medication) ||
        "";
      const parts: string[] = [];
      if (name) parts.push(String(name));
      if (typeof m.dose === "number" && m.dose > 0) {
        const u = typeof m.unit === "string" ? m.unit : "";
        parts.push(u ? `${m.dose} ${u}` : String(m.dose));
      }
      return parts.join(" · ");
    }
    case "temperature": {
      if (typeof m.value === "number") {
        if (m.unit === "C" || m.unit === "F") return `${m.value}°${m.unit}`;
        if (typeof m.unit === "string" && m.unit) return `${m.value} ${m.unit}`;
        return String(m.value);
      }
      return "";
    }
    case "growth": {
      const parts: string[] = [];
      if (typeof m.weight === "number")
        parts.push(
          `${m.weight} ${typeof m.weightUnit === "string" ? m.weightUnit : "kg"}`
        );
      if (typeof m.height === "number")
        parts.push(
          `${m.height} ${typeof m.heightUnit === "string" ? m.heightUnit : "cm"}`
        );
      if (typeof m.headCircumference === "number")
        parts.push(
          `head ${m.headCircumference} ${
            typeof m.headUnit === "string" ? m.headUnit : "cm"
          }`
        );
      return parts.join(" · ");
    }
    case "pumping": {
      if (typeof m.amount === "number" && m.amount > 0) {
        const u = typeof m.unit === "string" ? m.unit : "ml";
        return `${m.amount} ${u}`;
      }
      return "";
    }
    case "bath": {
      if (typeof m.waterTemp === "string" && m.waterTemp) return m.waterTemp;
      return "";
    }
    default:
      return "";
  }
}

function truncate(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function humanizeKey(s: string) {
  return s.replace(/_/g, " ");
}

/* =========================
   MAIN COMPONENT
========================= */

type DashboardActivityProps = {
  activities: Activity[];
  /** When true, omit the big section title (parent already has a label). */
  embed?: boolean;
};

export default function DashboardActivity({
  activities,
  embed = false,
}: DashboardActivityProps) {
  return (
    <section className="space-y-3">
      {!embed && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">
            Recent Activity
          </h2>

          <span className="text-xs text-neutral-500">
            {activities.length} total
          </span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {activities.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-neutral-500 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl p-4 text-center"
          >
            No activities yet. Log one from the quick actions above.
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.08 } },
            }}
            className="space-y-3"
          >
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* =========================
   CARD COMPONENT
========================= */

function ActivityCard({ activity }: { activity: Activity }) {
  const date = activity.startTime ? new Date(activity.startTime) : null;
  const endTime = activity.endTime
    ? new Date(activity.endTime)
    : null;
  const now = new Date();

  const isRecent = date
    ? now.getTime() - date.getTime() < 1000 * 60 * 60
    : false;

  const hasEnded = Boolean(
    endTime && !Number.isNaN(endTime.getTime())
  );
  const isOngoing = Boolean(
    date &&
      !hasEnded &&
      date.getTime() <= now.getTime()
  );

  const slug = (activity.slug || "").toLowerCase() || "";
  const typeLabel = activity.type || "Activity";
  const icon = ACTIVITY_ICONS[typeLabel] ?? "📌";
  const accent = SLUG_ACCENT[slug] || "bg-gray-400";

  const metadataLine = formatActivitySummary(
    slug || undefined,
    activity.metadata
  );
  const noteLine = activity.notes?.trim() ? truncate(activity.notes, 80) : "";

  return (
    <motion.div
      layout
      variants={{
        hidden: { opacity: 0, y: 12, scale: 0.98 },
        visible: { opacity: 1, y: 0, scale: 1 },
      }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="relative group"
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-transparent to-pink-500/10 blur-xl opacity-0 group-hover:opacity-100 transition duration-500" />

      <Card className="relative p-4 rounded-2xl border border-white/20 backdrop-blur-xl bg-white/70 dark:bg-white/5 shadow-sm group-hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
            <span aria-hidden>{icon}</span>
            {typeLabel}
          </p>

          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isOngoing
                ? "bg-amber-400"
                : isRecent
                  ? "bg-emerald-400"
                  : "bg-slate-300 dark:bg-slate-600"
            }`}
            title={isOngoing ? "In progress" : isRecent ? "Last hour" : "Earlier"}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
          <span>{date ? format(date, "EEE · h:mm a") : "Unknown"}</span>

          <span>
            {date
              ? isOngoing
                ? "In progress"
                : formatDistanceToNow(date, { addSuffix: true })
              : ""}
          </span>
        </div>

        <div className="mt-1 text-xs text-neutral-400 flex gap-2 flex-wrap items-center">
          {activity.duration != null && activity.duration > 0 && (
            <span className="text-neutral-500">{activity.duration} min</span>
          )}

          {metadataLine ? (
            <span className="text-neutral-500">
              {activity.duration != null && activity.duration > 0 ? "· " : ""}
              {metadataLine}
            </span>
          ) : null}
        </div>

        {noteLine ? (
          <p className="mt-1.5 text-xs text-neutral-500 line-clamp-2">
            {noteLine}
          </p>
        ) : null}

        <motion.div
          className={`mt-3 h-[2px] ${accent} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: "50%" }}
          transition={{ duration: 0.4 }}
        />
      </Card>
    </motion.div>
  );
}
