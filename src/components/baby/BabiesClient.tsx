"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BabyCard from "./BabyCard";
import type { Baby } from "@/lib/types/baby";

type Props = {
  babies: Baby[];
};

export default function BabiesClient({ babies }: Props) {
  const [search, setSearch] = useState("");
  const router = useRouter();

  const filteredBabies = useMemo(() => {
    return babies.filter((b) =>
      b.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, babies]);

  return (
    <div className="p-8 space-y-8">

      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Your Babies
          </h1>
          <p className="text-neutral-500">
            Manage your baby profiles and routines
          </p>
        </div>

        <Button
          onClick={() => router.push("/dashboard/babies/new")}
          className="bg-gradient-to-r from-indigo-500 to-pink-500 text-white shadow-lg hover:scale-105 transition-transform"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Baby
        </Button>
      </motion.div>

      {/* STATS */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.1 } },
        }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <StatCard title="Total Babies" value={babies.length} />
        <StatCard
          title="With Birth Date"
          value={babies.filter((b) => b.birthDate).length}
        />
        <StatCard
          title="Recently Added"
          value={Math.min(babies.length, 3)}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Card className="p-4 flex items-center gap-3 rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-white/5 border border-white/20 shadow-md">
          <Search className="w-4 h-4 text-neutral-500" />
          <Input
            placeholder="Search babies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-none focus-visible:ring-0 bg-transparent"
          />
        </Card>
      </motion.div>

      {/* BABY GRID */}
      {filteredBabies.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.div
          layout
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: { staggerChildren: 0.08 },
            },
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredBabies.map((baby) => (
            <motion.div
              key={baby.id}
              layout
              variants={{
                hidden: { opacity: 0, scale: 0.9, y: 20 },
                visible: {
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  transition: { duration: 0.35 },
                },
              }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
              className="relative group"
            >
              {/* Glow */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-transparent to-pink-500/10 blur-xl opacity-0 group-hover:opacity-100 transition duration-500" />

              <BabyCard baby={baby} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

/* ---------- Stat Card ---------- */

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      whileHover={{ scale: 1.03 }}
    >
      <Card className="p-6 rounded-2xl border border-white/20 backdrop-blur-xl bg-white/70 dark:bg-white/5 shadow-md hover:shadow-xl transition-all">

        <p className="text-sm text-neutral-500">{title}</p>

        <motion.p
          className="text-3xl font-bold mt-2 text-neutral-800 dark:text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {value}
        </motion.p>

        {/* animated line */}
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

/* ---------- Empty State ---------- */

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-16"
    >
      <p className="text-lg font-medium text-neutral-600 dark:text-neutral-300">
        No babies added yet 👶
      </p>
      <p className="mt-2 text-neutral-500">
        Start by adding your first baby profile.
      </p>
    </motion.div>
  );
}