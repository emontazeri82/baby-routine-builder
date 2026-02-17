"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Plus, Search } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import BabyCard from "./BabyCard";

type Baby = {
  id: string;
  name: string;
  birthDate: string | null;
  gender: string | null;
  photoUrl: string | null;
};

export default function BabiesClient({
  babies,
}: {
  babies: Baby[];
}) {
  const [search, setSearch] = useState("");

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
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold">Your Babies</h1>
          <p className="text-neutral-500">
            Manage your baby profiles and routines
          </p>
        </div>

        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Baby
        </Button>
      </motion.div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Babies" value={babies.length} />
        <StatCard
          title="With Birth Date"
          value={babies.filter((b) => b.birthDate).length}
        />
        <StatCard
          title="Recently Added"
          value={Math.min(babies.length, 3)}
        />
      </div>

      {/* SEARCH */}
      <Card className="p-4 flex items-center gap-2">
        <Search className="w-4 h-4 text-neutral-500" />
        <Input
          placeholder="Search babies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-none focus-visible:ring-0"
        />
      </Card>

      {/* BABY GRID */}
      {filteredBabies.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredBabies.map((baby) => (
            <motion.div
              key={baby.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <BabyCard baby={baby} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

/* ---------- Small Components ---------- */

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <Card className="p-6">
      <p className="text-sm text-neutral-500">{title}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-neutral-500">
      <p className="text-lg font-medium">
        No babies added yet 👶
      </p>
      <p className="mt-2">
        Start by adding your first baby profile.
      </p>
    </div>
  );
}
