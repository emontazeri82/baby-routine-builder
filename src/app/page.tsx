"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white text-slate-800">

      {/* ================= HERO ================= */}
      <section className="px-6 py-24 md:py-32">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">

          {/* Left Content */}
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-6xl font-semibold leading-tight"
            >
              A Smarter Way to Build Your Baby’s Daily Routine
            </motion.h1>

            <p className="mt-6 text-lg text-slate-600 max-w-xl">
              Track naps, feedings, mood patterns, and daily structure —
              all in one intelligent dashboard designed to reduce stress
              and bring calm predictability to your family’s day.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/dashboard"
                className="px-8 py-3 bg-sky-600 text-white rounded-xl shadow hover:bg-sky-700 transition"
              >
                Start Free
              </Link>

              <Link
                href="/dashboard"
                className="px-8 py-3 border border-sky-600 text-sky-600 rounded-xl hover:bg-sky-50 transition"
              >
                View Demo Dashboard
              </Link>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              No credit card required.
            </p>
          </div>

          {/* Right Preview Card */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-100"
          >
            <h3 className="text-xl font-semibold mb-6">
              Today’s Overview
            </h3>

            <div className="space-y-4 text-slate-600">
              <div className="flex justify-between">
                <span>Next Feeding</span>
                <span className="font-medium text-slate-800">2:30 PM</span>
              </div>

              <div className="flex justify-between">
                <span>Last Nap Duration</span>
                <span className="font-medium text-slate-800">1h 20m</span>
              </div>

              <div className="flex justify-between">
                <span>Mood Trend</span>
                <span className="font-medium text-green-600">Stable</span>
              </div>

              <div className="flex justify-between">
                <span>Upcoming Alert</span>
                <span className="font-medium text-sky-600">
                  Nap Window Soon
                </span>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ================= TRUST SECTION ================= */}
      <section className="py-20 bg-white px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold">
            Designed for Calm, Built with Intelligence
          </h2>

          <p className="mt-6 text-slate-600 max-w-2xl mx-auto">
            Parenting is unpredictable — your routine doesn’t have to be.
            Our system adapts to your baby’s natural rhythms to help you
            anticipate needs before stress builds.
          </p>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="py-24 bg-sky-50 px-6">
        <div className="max-w-6xl mx-auto">

          <h2 className="text-3xl md:text-4xl font-semibold text-center">
            Everything You Need in One Dashboard
          </h2>

          <div className="grid md:grid-cols-3 gap-12 mt-16">

            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <h3 className="text-xl font-semibold mb-4">
                Smart Routine Builder
              </h3>
              <p className="text-slate-600">
                Create age-based daily schedules that evolve as your baby grows.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <h3 className="text-xl font-semibold mb-4">
                Sleep & Feeding Tracking
              </h3>
              <p className="text-slate-600">
                Log naps, night sleep, bottles, and meals with one tap.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <h3 className="text-xl font-semibold mb-4">
                Predictive Insights
              </h3>
              <p className="text-slate-600">
                Receive alerts based on historical patterns and timing windows.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="py-24 bg-white px-6">
        <div className="max-w-5xl mx-auto text-center">

          <h2 className="text-3xl md:text-4xl font-semibold">
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-12 mt-16 text-left">

            <div>
              <div className="text-sky-600 font-bold text-2xl">1</div>
              <h4 className="mt-4 font-semibold">Track Daily Events</h4>
              <p className="mt-2 text-slate-600">
                Log feedings, naps, and activities throughout the day.
              </p>
            </div>

            <div>
              <div className="text-sky-600 font-bold text-2xl">2</div>
              <h4 className="mt-4 font-semibold">Analyze Patterns</h4>
              <p className="mt-2 text-slate-600">
                Our engine detects sleep windows and rhythm shifts.
              </p>
            </div>

            <div>
              <div className="text-sky-600 font-bold text-2xl">3</div>
              <h4 className="mt-4 font-semibold">Get Smart Alerts</h4>
              <p className="mt-2 text-slate-600">
                Receive guidance before overtiredness or hunger spikes.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="py-24 bg-sky-600 text-white text-center px-6">
        <h2 className="text-3xl md:text-4xl font-semibold">
          Bring Structure Back to Your Day
        </h2>

        <Link
          href="/register"
          className="inline-block mt-8 px-10 py-4 bg-white text-sky-600 rounded-xl shadow hover:bg-sky-100 transition"
        >
          Create Your Free Account
        </Link>
      </section>

    </main>
  );
}
