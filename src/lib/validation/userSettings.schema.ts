// lib/validation/userSettings.schema.ts

import { z } from "zod";

/* ---------- PASSWORD ---------- */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must include uppercase")
  .regex(/[a-z]/, "Must include lowercase")
  .regex(/[0-9]/, "Must include number")
  .regex(/[^A-Za-z0-9]/, "Must include special character");

/* ---------- UPDATE PASSWORD ---------- */
export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

/* ---------- PROFILE ---------- */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name too long")
    .regex(/^[a-zA-Z\s'-]+$/, "Invalid characters in name"),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email")
    .optional(),
});

/* ---------- PREFERENCES ---------- */
export const updatePreferencesSchema = z.object({
  notifications: z.boolean(),
  darkMode: z.boolean(),
});

/* ---------- DELETE ---------- */
export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
});
