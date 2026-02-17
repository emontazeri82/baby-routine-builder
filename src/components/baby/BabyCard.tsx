"use client";

import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreVertical } from "lucide-react";

type Baby = {
  id: string;
  name: string;
  birthDate: string | null;
  gender: string | null;
  photoUrl: string | null;
};

export default function BabyCard({ baby }: { baby: Baby }) {
  const age = baby.birthDate
    ? formatDistanceToNow(new Date(baby.birthDate), {
        addSuffix: false,
      })
    : null;

  return (
    <Card className="p-5 hover:shadow-lg transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar baby={baby} />
          <div>
            <h3 className="font-semibold text-lg">
              {baby.name}
            </h3>
            {age && (
              <p className="text-sm text-neutral-500">
                {age} old
              </p>
            )}
          </div>
        </div>

        <Button size="icon" variant="ghost">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>

      <div className="mt-4 flex gap-2">
        {baby.gender && (
          <Badge variant="outline">
            {baby.gender}
          </Badge>
        )}

        {baby.birthDate && (
          <Badge>
            Born {new Date(baby.birthDate).toLocaleDateString()}
          </Badge>
        )}
      </div>
    </Card>
  );
}

function Avatar({ baby }: { baby: Baby }) {
  if (baby.photoUrl) {
    return (
      <img
        src={baby.photoUrl}
        alt={baby.name}
        className="w-12 h-12 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center text-sm font-medium">
      {baby.name[0]}
    </div>
  );
}
