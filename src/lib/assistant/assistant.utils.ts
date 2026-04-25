export type FormatDurationOptions = {
  style?: "short" | "long";
  maxUnits?: 1 | 2 | 3;
  round?: boolean;
};

export const calculateScore = ({
  base,
  recencyMinutes,
  confidence = 1,
}: {
  base: number;
  recencyMinutes?: number;
  confidence?: number;
}) => {
  let score = base;

  if (recencyMinutes !== undefined) {
    if (recencyMinutes < 60) score += 20;
    else if (recencyMinutes < 180) score += 10;
  }

  return score * confidence;
};

export const formatDuration = (
  inputMinutes: number,
  options: FormatDurationOptions = {}
): string => {
  const {
    style = "short",
    maxUnits = 2,
    round = false,
  } = options;

  // ✅ Safety
  if (!Number.isFinite(inputMinutes) || inputMinutes < 0) {
    return "0m";
  }

  let minutes = round
    ? Math.round(inputMinutes)
    : Math.floor(inputMinutes);

  // ✅ Units
  const days = Math.floor(minutes / 1440);
  minutes -= days * 1440;

  const hours = Math.floor(minutes / 60);
  minutes -= hours * 60;

  const mins = minutes;

  // ✅ Build units array
  const parts: { value: number; short: string; long: string }[] = [
    { value: days, short: "d", long: "day" },
    { value: hours, short: "h", long: "hour" },
    { value: mins, short: "m", long: "minute" },
  ];

  const filtered = parts.filter((part) => part.value > 0);

  if (filtered.length === 0) {
    return style === "long" ? "0 minutes" : "0m";
  }

  const selected = filtered.slice(0, maxUnits);

  return selected
    .map((part) => {
      if (style === "short") {
        return `${part.value}${part.short}`;
      }

      const plural = part.value === 1 ? "" : "s";
      return `${part.value} ${part.long}${plural}`;
    })
    .join(" ");
};

export default calculateScore;