import {
  FeedingMetadataSchema,
  NapMetadataSchema,
  SleepMetadataSchema,
  DiaperMetadataSchema,
  PlayMetadataSchema,
  MedicineMetadataSchema,
  BathMetadataSchema,
  TemperatureMetadataSchema,
  GrowthMetadataSchema,
  PumpingMetadataSchema,
} from "@/lib/activitySchemas";

export function getActivityCompleteness(
  activityType: string,
  metadata: unknown,
  endTime?: Date | null
) {

  /* Duration activities must have endTime */

  if (
    ["Sleep", "Nap", "Play", "Pumping"].includes(activityType)
  ) {
    if (!endTime) return "partial";
  }

  /* Validate metadata with the exact schema */

  let result: { success: boolean };

  switch (activityType) {

    case "Feeding":
      result = FeedingMetadataSchema.safeParse(metadata);
      break;

    case "Nap":
      result = NapMetadataSchema.safeParse(metadata);
      break;

    case "Sleep":
      result = SleepMetadataSchema.safeParse(metadata);
      break;

    case "Diaper":
      result = DiaperMetadataSchema.safeParse(metadata);
      break;

    case "Play":
      result = PlayMetadataSchema.safeParse(metadata);
      break;

    case "Medicine":
      result = MedicineMetadataSchema.safeParse(metadata);
      break;

    case "Bath":
      result = BathMetadataSchema.safeParse(metadata);
      break;

    case "Temperature":
      result = TemperatureMetadataSchema.safeParse(metadata);
      break;

    case "Growth":
      result = GrowthMetadataSchema.safeParse(metadata);
      break;

    case "Pumping":
      result = PumpingMetadataSchema.safeParse(metadata);
      break;

    default:
      return "partial";
  }

  return result.success ? "complete" : "partial";

}