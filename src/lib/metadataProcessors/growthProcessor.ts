import { GrowthMetadataSchema } from "@/lib/activitySchemas";

export function processGrowthMetadata(rawMetadata: unknown) {
  const parsedMeta = GrowthMetadataSchema.parse(rawMetadata);

  const {
    weight,
    weightUnit,
    height,
    heightUnit,
    headCircumference,
    headUnit,
  } = parsedMeta;

  if (
    weight == null &&
    height == null &&
    headCircumference == null
  ) {
    throw new Error("At least one growth measurement is required");
  }

  let normalizedWeight: number | null = null;
  let normalizedHeight: number | null = null;
  let normalizedHead: number | null = null;

  if (typeof weight === "number") {
    if (!weightUnit) {
      throw new Error("Weight unit is required when weight is provided");
    }

    if (weightUnit === "kg") normalizedWeight = weight;
    else if (weightUnit === "lb") normalizedWeight = weight * 0.453592;
    else throw new Error("Invalid weight unit");
  }


  if (typeof height === "number") {
    if (heightUnit === "cm") normalizedHeight = height;
    else if (heightUnit === "inch") normalizedHeight = height * 2.54;
    else throw new Error("Invalid height unit");
  }

  if (typeof headCircumference === "number") {
    if (headUnit === "cm") normalizedHead = headCircumference;
    else if (headUnit === "inch") normalizedHead = headCircumference * 2.54;
    else throw new Error("Invalid head unit");
  }

  return {
    weight: normalizedWeight,
    weightUnit: "kg",
    height: normalizedHeight,
    heightUnit: "cm",
    headCircumference: normalizedHead,
    headUnit: "cm",
  };
}
