"use client";
import BabyForm from "@/components/baby/BabyForm";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewBabyPage() {
  const router = useRouter();

  return (
    <BabyForm
      mode="create"
      onSubmit={async (data) => {
        await fetch("/api/babies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        router.push("/dashboard");
      }}
    />
  );
}