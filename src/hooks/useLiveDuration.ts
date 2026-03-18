// hooks/useLiveDuration.ts
import { useEffect, useState } from "react";

export function useLiveDuration(startTime?: Date | null) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const start = new Date(startTime).getTime();

      const diff = Math.floor((now - start) / 1000); // seconds
      setDuration(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return duration;
}