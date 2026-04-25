export type ActivityType =
  | "feeding"
  | "sleep"
  | "growth"
  | "diaper"
  | "play"
  | "bath"
  | "medicine"
  | "temperature"
  | "nap"
  | "pumping";

export type Activity = {
  id: string;

  activityType: ActivityType;

  startTime: string | Date;
  endTime?: string | Date | null;

  babyId?: string;

  createdAt?: Date;
  updatedAt?: Date;

  /** Normalized metric where applicable (ml, °C, kg, etc.) — often mirrored from metadata. */
  value?: number;

  metadata?: {
    amount?: number;
    unit?: "ml" | "oz";

    method?: "breast" | "bottle" | "solid";
    side?: "left" | "right";

    quality?: "good" | "okay" | "poor";

    type?: "wet" | "dirty" | "mixed";

    intensity?: "low" | "medium" | "high";

    [key: string]: any;
  };
};
