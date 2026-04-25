"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Baby } from "lucide-react";

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

type Props = {
  mode: "create" | "edit";
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
};

export default function BabyForm({ mode, initialData, onSubmit }: Props) {
  const [isPending, startTransition] = useTransition();
  const currentYear = new Date().getFullYear();

  const [form, setForm] = useState({
    name: initialData?.name || "",
    gender: initialData?.gender || "",
    month: initialData?.month || "",
    day: initialData?.day || "",
    year: initialData?.year || "",
  });

  // ✅ Avatar states
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialData?.photoUrl || null
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [error, setError] = useState("");

  function handleChange(e: any) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function generateDays() {
    return Array.from({ length: 31 }, (_, i) => i + 1);
  }

  function generateYears() {
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    setError("");

    if (!form.name || !form.gender || !form.month || !form.day || !form.year) {
      setError("Please complete all required fields.");
      return;
    }

    const birthDate = `${form.year}-${String(Number(form.month) + 1).padStart(2, "0")}-${String(form.day).padStart(2, "0")}`;

    startTransition(async () => {
      try {
        await onSubmit({
          ...form,
          birthDate,
          photoFile, // ✅ include image
        });
      } catch (err: any) {
        setError(err.message || "Something went wrong.");
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-md"
      >
        {/* Glow */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-transparent to-pink-500/10 blur-2xl" />

        <div className="relative bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-8 space-y-6">

          {/* HEADER */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 text-white shadow-md">
              <Baby className="w-5 h-5" />
            </div>

            <h1 className="text-2xl font-semibold bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">
              {mode === "edit" ? "Edit Baby" : "Add Baby"}
            </h1>
          </div>

          {/* 🔥 AVATAR UPLOADER */}
          <div className="flex flex-col items-center gap-3">

            <label className="relative cursor-pointer group">

              {/* Glow effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/20 to-pink-500/20 blur-xl opacity-0 group-hover:opacity-100 transition" />

              {/* Avatar preview */}
              {photoPreview ? (
                <img
                  src={photoPreview}
                  className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400 flex items-center justify-center text-white text-xl font-semibold shadow-md">
                  {form.name ? form.name[0] : "👶"}
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center text-xs text-white opacity-0 group-hover:opacity-100">
                Upload
              </div>

              {/* Hidden input */}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  setPhotoFile(file);
                  setPhotoPreview(URL.createObjectURL(file));
                }}
              />
            </label>

            <p className="text-xs text-neutral-500">
              Optional: Add baby photo
            </p>

          </div>

          {/* ERROR */}
          {error && (
            <div className="bg-red-100 text-red-600 text-sm px-4 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">

            <InputField
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Baby's name"
            />

            <SelectField
              name="gender"
              value={form.gender}
              onChange={handleChange}
              options={[
                { label: "Girl", value: "female" },
                { label: "Boy", value: "male" },
              ]}
              placeholder="Select Gender"
            />

            <div className="grid grid-cols-3 gap-3">
              <SelectField
                name="month"
                value={form.month}
                onChange={handleChange}
                placeholder="Month"
                options={months.map((m, i) => ({
                  label: m,
                  value: i,
                }))}
              />

              <SelectField
                name="day"
                value={form.day}
                onChange={handleChange}
                placeholder="Day"
                options={generateDays().map((d) => ({
                  label: d.toString(),
                  value: d,
                }))}
              />

              <SelectField
                name="year"
                value={form.year}
                onChange={handleChange}
                placeholder="Year"
                options={generateYears().map((y) => ({
                  label: y.toString(),
                  value: y,
                }))}
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={isPending}
              type="submit"
              className="w-full py-3 rounded-xl text-white font-medium bg-gradient-to-r from-indigo-500 to-pink-500 shadow-md hover:shadow-lg transition-all"
            >
              {isPending
                ? "Saving..."
                : mode === "edit"
                ? "Save Changes"
                : "Create Baby"}
            </motion.button>

          </form>
        </div>
      </motion.div>
    </div>
  );
}

/* ---------- Inputs ---------- */

function InputField({ name, value, onChange, placeholder }: any) {
  return (
    <input
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-4 py-2 rounded-xl border border-white/20 bg-white/70 dark:bg-white/5 backdrop-blur focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
      required
    />
  );
}

function SelectField({ name, value, onChange, options, placeholder }: any) {
  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="w-full px-3 py-2 rounded-xl border border-white/20 bg-white/70 dark:bg-white/5 backdrop-blur focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
      required
    >
      <option value="">{placeholder}</option>
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}