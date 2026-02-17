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
  rash: z.boolean().optional(),
});

/* ---------------- Play ---------------- */

export const PlayMetadataSchema = z.object({
  activityType: z.enum(["tummy_time", "reading", "outside", "toy"]),
  mood: z.enum(["happy", "neutral", "fussy"]).optional(),
});

/* ---------------- Medicine ---------------- */

export const MedicineMetadataSchema = z.object({
  name: z.string().min(1),
  dose: z.number().positive(),
  unit: z.string(),
});

/* ---------------- Bath ---------------- */

export const BathMetadataSchema = z.object({
  temperature: z.number().optional(),
  productsUsed: z.string().optional(),
});

/* ---------------- Temperature ---------------- */

export const TemperatureMetadataSchema = z.object({
  value: z.number(),
  unit: z.enum(["C", "F"]),
});

/* ---------------- Growth ---------------- */

export const GrowthMetadataSchema = z.object({
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  headCircumference: z.number().positive().optional(),
});

/* ---------------- Pumping ---------------- */

export const PumpingMetadataSchema = z.object({
  side: z.enum(["left", "right", "both"]),
  amount: z.number().positive(),
  unit: z.enum(["ml", "oz"]),
});
