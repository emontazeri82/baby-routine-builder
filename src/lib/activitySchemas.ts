import { z } from "zod";

/* ---------------- Feeding ---------------- */

export const FeedingMetadataSchema = z.object({
  method: z.enum(["breast", "bottle", "formula", "solid"]),
  amount: z.number().positive().optional(),
  unit: z.enum(["ml", "oz", "g"]).optional(),
  side: z.enum(["left", "right", "both"]).optional(),
});

/* ---------------- Nap ---------------- */

export const NapMetadataSchema = z.object({
  location: z.enum(["crib", "stroller", "car", "parent"]).optional(),
  quality: z.enum(["good", "fair", "poor"]).optional(),
  assisted: z.boolean().optional(),
});

/* ---------------- Sleep ---------------- */

export const SleepMetadataSchema = z.object({
  wakeUps: z.number().int().min(0).optional(),
  location: z.enum(["crib", "parent_bed"]).optional(),
  quality: z.enum(["good", "restless", "frequent_wake"]).optional(),
});

/* ---------------- Diaper ---------------- */

export const DiaperMetadataSchema = z.object({
  type: z.enum(["wet", "dirty", "mixed"]),
  rash: z.boolean().optional().default(false),

  volume: z
    .enum(["small", "medium", "large"])
    .nullable()
    .optional(),

  color: z
    .enum(["yellow", "green", "brown", "black", "red"])
    .nullable()
    .optional(),

  texture: z
    .enum(["normal", "watery", "hard", "mucus"])
    .nullable()
    .optional(),
});


/* ---------------- Play ---------------- */

const PlayTypeSchema = z.enum([
  "tummy_time",
  "reading",
  "outside",
  "toy",
  "toy_play",
  "sensory",
  "music",
  "movement",
]);

const PlayMoodSchema = z.enum([
  "happy",
  "neutral",
  "fussy",
  "excited",
  "tired",
]);

export const PlayMetadataSchema = z
  .object({
    // legacy key used in previous play form
    activityType: PlayTypeSchema.optional(),
    // current key used in play form page
    playType: PlayTypeSchema.optional(),
    mood: PlayMoodSchema.optional(),
    location: z
      .enum(["indoor", "outdoor", "park", "playroom", "stroller"])
      .optional(),
    intensity: z.enum(["calm", "moderate", "active"]).optional(),
    skills: z
      .array(z.enum(["motor", "cognitive", "social", "language", "sensory"]))
      .optional(),
  })
  .refine(
    (value) => Boolean(value.activityType || value.playType),
    { message: "Play type is required", path: ["playType"] }
  )
  .transform((value) => {
    const canonicalType = value.playType ?? value.activityType;
    return {
      ...value,
      activityType: canonicalType,
      playType: canonicalType,
    };
  });

/* ---------------- Medicine ---------------- */

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

export const MedicineMetadataSchema = z.object({
  // Support both legacy key (name) and current form key (medicineName).
  name: z.preprocess(emptyStringToUndefined, z.string().min(1)).optional(),
  medicineName: z.preprocess(emptyStringToUndefined, z.string().min(1)).optional(),
  dose: z.number().positive(),
  unit: z.enum(["ml", "mg", "drops", "tablet"]),
  method: z.preprocess(
    emptyStringToUndefined,
    z.enum(["oral", "drops", "injection", "inhaler"])
  ).optional(),
  reason: z.preprocess(
    emptyStringToUndefined,
    z.enum(["fever", "pain", "infection", "vitamins", "allergy"])
  ).optional(),
  reaction: z.preprocess(
    emptyStringToUndefined,
    z.enum(["none", "sleepy", "vomiting", "rash", "irritable"])
  ).optional(),
  notes: z.string().optional(),
})
  .refine((value) => Boolean(value.name || value.medicineName), {
    message: "Medicine name is required",
    path: ["medicineName"],
  })
  .transform((value) => {
    const resolvedName = value.medicineName ?? value.name ?? "";
    return {
      ...value,
      name: resolvedName,
      medicineName: resolvedName,
    };
  });

/* ---------------- Bath ---------------- */

export const BathMetadataSchema = z.object({
  bathType: z
    .enum(["full_bath", "quick_rinse", "hair_wash"])
    .optional(),
  location: z
    .enum(["tub", "sink", "baby_bath"])
    .optional(),
  temperature: z.number().optional(),
  productsUsed: z.string().optional(),
  moodBefore: z
    .enum(["happy", "fussy", "calm", "sleepy"])
    .optional(),
  moodAfter: z
    .enum(["happy", "fussy", "calm", "sleepy"])
    .optional(),
});

/* ---------------- Temperature ---------------- */

export const TemperatureMetadataSchema = z.object({
  value: z.number(),
  unit: z.enum(["C", "F"]),
});

/* ---------------- Growth ---------------- */

export const GrowthMetadataSchema = z.object({
  weight: z.number().positive().optional(),
  weightUnit: z.enum(["kg", "lb"]).optional(),

  height: z.number().positive().optional(),
  heightUnit: z.enum(["cm", "inch"]).optional(),

  headCircumference: z.number().positive().optional(),
  headUnit: z.enum(["cm", "inch"]).optional(),
});


/* ---------------- Pumping ---------------- */

export const PumpingMetadataSchema = z.object({
  side: z.enum(["left", "right", "both"]),

  amountMl: z
    .number()
    .min(0)
    .optional(),

  unit: z
    .enum(["ml", "oz"])
    .optional(),

  durationMinutes: z
    .number()
    .min(0)
    .optional(),

  comfort: z
    .enum(["comfortable", "neutral", "painful"])
    .optional(),

  notes: z
    .string()
    .max(500)
    .optional(),
});
