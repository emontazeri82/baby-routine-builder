import { db } from "@/lib/db";
import { activityTypes } from "@/lib/db/schema";

export async function seedActivityTypes() {
  console.log("🌱 Seeding activity types...");

  const types = [
    { name: "Feeding", slug: "feeding", icon: "utensils", color: "blue" },
    { name: "Nap", slug: "nap", icon: "moon", color: "indigo" },
    { name: "Sleep", slug: "sleep", icon: "bed", color: "purple" },
    { name: "Diaper", slug: "diaper", icon: "baby", color: "yellow" },
    { name: "Play", slug: "play", icon: "ball", color: "green" },
    { name: "Medicine", slug: "medicine", icon: "pill", color: "red" },
    { name: "Bath", slug: "bath", icon: "droplets", color: "cyan" },
    { name: "Temperature", slug: "temperature", icon: "thermometer", color: "orange" },
    { name: "Growth", slug: "growth", icon: "ruler", color: "pink" },
    { name: "Pumping", slug: "pumping", icon: "milk", color: "teal" },
  ];

  for (const type of types) {
    await db
      .insert(activityTypes)
      .values(type)
      .onConflictDoNothing();
  }

  console.log("✅ Activity types seeded successfully!");
}
