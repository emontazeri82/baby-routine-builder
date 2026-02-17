"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Baby, Calendar } from "lucide-react";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function NewBabyPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const currentYear = new Date().getFullYear();

  const [form, setForm] = useState({
    name: "",
    gender: "",
    month: "",
    day: "",
    year: "",
  });

  const [error, setError] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function generateDays() {
    return Array.from({ length: 31 }, (_, i) => i + 1);
  }

  function generateYears() {
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!form.name || !form.gender || !form.month || !form.day || !form.year) {
      setError("Please complete all required fields.");
      return;
    }

    // ✅ Send plain YYYY-MM-DD (no timezone shift)
    const birthDate = `${form.year}-${String(Number(form.month) + 1).padStart(2, "0")}-${String(form.day).padStart(2, "0")}`;

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    startTransition(async () => {
      try {
        const res = await fetch("/api/babies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            gender: form.gender,
            birthDate,
            timezone,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Request failed");
        }

        router.push("/dashboard");

      } catch (err: any) {
        console.error(err);
        setError(err.message || "Something went wrong.");
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900 px-6 py-10">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-8 space-y-6">

        <div className="flex items-center gap-3">
          <Baby className="w-6 h-6 text-blue-500" />
          <h1 className="text-2xl font-semibold">Add Baby</h1>
        </div>

        {error && (
          <div className="bg-red-100 text-red-600 text-sm px-4 py-2 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Baby's name"
            className="w-full border rounded-lg px-4 py-2"
            required
          />

          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className="w-full border rounded-lg px-4 py-2"
            required
          >
            <option value="">Select Gender</option>
            <option value="female">Girl</option>
            <option value="male">Boy</option>
          </select>

          <div className="grid grid-cols-3 gap-3">
            <select name="month" value={form.month} onChange={handleChange} required>
              <option value="">Month</option>
              {months.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>

            <select name="day" value={form.day} onChange={handleChange} required>
              <option value="">Day</option>
              {generateDays().map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select name="year" value={form.year} onChange={handleChange} required>
              <option value="">Year</option>
              {generateYears().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-black text-white rounded-lg py-3"
          >
            {isPending ? "Creating..." : "Create Baby"}
          </button>

        </form>
      </div>
    </div>
  );
}
