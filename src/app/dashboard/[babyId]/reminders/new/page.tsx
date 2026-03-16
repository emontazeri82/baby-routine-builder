"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";

const reminderTypes = [
  { name: "Feeding", slug: "feeding" },
  { name: "Nap", slug: "nap" },
  { name: "Sleep", slug: "sleep" },
  { name: "Diaper", slug: "diaper" },
  { name: "Play", slug: "play" },
  { name: "Medicine", slug: "medicine" },
  { name: "Bath", slug: "bath" },
  { name: "Temperature", slug: "temperature" },
  { name: "Growth", slug: "growth" },
  { name: "Pumping", slug: "pumping" },
  { name: "Simple Reminder", slug: "simple" },
];

export default function NewReminderPage() {
  const params = useParams();
  const babyId = params.babyId as string;

  return (
    <div className="min-h-screen p-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold">
          Select Reminder Type
        </h1>
        <p className="text-neutral-500">
          Schedule a future activity
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {reminderTypes.map((type) => (
          <motion.div
            key={type.slug}
            whileHover={{ scale: 1.05 }}
          >
            <Card className="hover:shadow-lg transition p-0">
              <Button
                asChild
                variant="ghost"
                className="w-full h-24 text-lg rounded-xl"
              >
                <Link
                  href={`/dashboard/${babyId}/reminders/new/${type.slug}`}
                >
                  {type.name}
                </Link>
              </Button>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
