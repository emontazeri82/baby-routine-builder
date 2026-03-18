export type ActivityType = {
  name: string;
  slug: string;
  icon?: string;
};

export const ACTIVITY_TYPES: ActivityType[] = [
  { name: "Feeding", slug: "feeding", icon: "🍼" },
  { name: "Sleep", slug: "sleep", icon: "😴" },
  { name: "Nap", slug: "nap", icon: "💤" },
  { name: "Diaper", slug: "diaper", icon: "🧷" },
  { name: "Play", slug: "play", icon: "🧸" },
  { name: "Medicine", slug: "medicine", icon: "💊" },
  { name: "Bath", slug: "bath", icon: "🛁" },
  { name: "Temperature", slug: "temperature", icon: "🌡️" },
  { name: "Growth", slug: "growth", icon: "📏" },
  { name: "Pumping", slug: "pumping", icon: "🍼" },
];
