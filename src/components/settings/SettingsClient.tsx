"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Lock,
  Bell,
  Moon,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { useUserSettings } from "@/hooks/useUserSettings";

import {
  updateProfileSchema,
  updatePasswordSchema,
  deleteAccountSchema,
} from "@/lib/validation/userSettings.schema";


/* ---------------- Types ---------------- */

type UserType = {
  id: string;
  name?: string | null;
  email?: string | null;
};

/* ---------------- Component ---------------- */

export default function SettingsClient({
  user,
}: {
  user: UserType;
}) {
  const [notifications, setNotifications] = useState(false);
  const [emailReminders, setEmailReminders] = useState(false);
  const [emailReminderLeadMinutes, setEmailReminderLeadMinutes] =
    useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState(true);

  const [name, setName] = useState(user?.name || "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [deletePassword, setDeletePassword] = useState("");
  const {
    loading,
    handleUpdateProfile,
    handleUpdatePassword,
    handleUpdatePreferences,
    handleDeleteAccount,
  } = useUserSettings();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);
  useEffect(() => {
    fetch("/api/user/preferences")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then(data => {
        setNotifications(
          data.inAppNotificationsEnabled ?? true
        );
        setEmailReminders(
          data.emailRemindersEnabled ?? false
        );
        setEmailReminderLeadMinutes(
          data.emailReminderLeadMinutes ?? 0
        );
        setDarkMode(data.darkMode ?? false);
        setWeeklySummary(
          data.weeklySummaryEnabled ?? true
        );
      })
      .catch(() => {
        console.error("Failed to load preferences");
      });
  }, []);
  const cardSurface =
    "border border-white/40 bg-white/70 shadow-[0_12px_40px_rgba(99,102,241,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:shadow-[0_12px_40px_rgba(0,0,0,0.35)]";

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.07, delayChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 380, damping: 28 },
    },
  };

  return (
    <div
      className="
        relative min-h-screen overflow-hidden
        bg-gradient-to-br from-sky-100 via-violet-100 to-fuchsia-200
        dark:from-indigo-950 dark:via-violet-950 dark:to-fuchsia-950
      "
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          aria-hidden
          className="absolute left-[-80px] top-[-80px] h-[420px] w-[420px] rounded-full bg-cyan-400/35 blur-3xl dark:bg-cyan-500/20"
          animate={{
            scale: [1, 1.12, 1],
            opacity: [0.45, 0.65, 0.45],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute bottom-[-100px] right-[-60px] h-[380px] w-[380px] rounded-full bg-fuchsia-400/35 blur-3xl dark:bg-fuchsia-500/25"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        />
        <motion.div
          aria-hidden
          className="absolute left-1/3 top-1/2 h-[280px] w-[280px] -translate-y-1/2 rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-500/15"
          animate={{ rotate: [0, 8, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6 sm:py-12"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >

        {/* ================= HEADER ================= */}
        <motion.div variants={itemVariants}>
          <h1 className="
            text-4xl font-bold tracking-tight
            bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600
            bg-clip-text text-transparent drop-shadow-sm
            dark:from-pink-300 dark:via-fuchsia-400 dark:to-cyan-300
          ">
            Account Settings
          </h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-300">
            Manage your account, security, and preferences
          </p>
        </motion.div>

        {/* ================= PROFILE ================= */}
        <motion.div variants={itemVariants}>
          <Card className={`
          space-y-8 rounded-2xl p-8
          transition-all duration-300
          hover:scale-[1.01] hover:shadow-[0_20px_60px_rgba(99,102,241,0.2)]
          dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]
          ${cardSurface}
        `}>
            <SectionTitle icon={<User size={18} />} title="Profile Information" />

            <div className="flex items-center gap-6">
              <Avatar name={user?.name || "U"} />

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="
                bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500
                text-white
                shadow-lg
                hover:shadow-xl
                transition-all
              ">
                  <Upload className="w-4 h-4 mr-2" />
                  Change Avatar
                </Button>
              </motion.div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>Name</Label>
                <Input className="
                bg-white/70 dark:bg-white/10
                backdrop-blur
                border border-white/20
                focus:ring-2 focus:ring-purple-400
                focus:border-purple-400
                transition-all duration-200
              "
                  value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div>
                <Label>Email</Label>
                <div className="relative">
                  <Input
                    className="
                  bg-white/70 dark:bg-white/10
                  backdrop-blur
                  border border-white/20
                  focus:ring-2 focus:ring-purple-400
                  focus:border-purple-400
                  transition-all duration-200
                "
                    defaultValue={user?.email || ""} disabled />
                  <Badge className="absolute right-3 top-2 text-xs">
                    Verified
                  </Badge>
                </div>
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button className="
              bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500
              text-white
              shadow-lg
              hover:shadow-xl
              transition-all"
                onClick={async () => {
                  const result = updateProfileSchema.safeParse({ name });

                  if (!result.success) {
                    toast.error(result.error.issues[0].message);
                    return;
                  }

                  try {
                    await handleUpdateProfile(result.data);
                    toast.success("Profile updated", {
                      style: {
                        background: "linear-gradient(to right, #6366f1, #a855f7)",
                        color: "white",
                      },
                    });
                  } catch {
                    toast.error("Update failed");
                  }
                }}
                disabled={loading}
              >
                Save Changes
              </Button>
            </motion.div>
          </Card>
        </motion.div>

        {/* ================= SECURITY ================= */}
        <motion.div variants={itemVariants}>
          <Card className={`
          space-y-8 rounded-2xl p-8
          transition-all duration-300
          hover:scale-[1.01] hover:shadow-[0_20px_60px_rgba(99,102,241,0.2)]
          dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]
          ${cardSurface}
        `}>
            <SectionTitle icon={<Lock size={18} />} title="Security" />

            <div className="grid gap-4">
              <Input
                className="
              bg-white/70 dark:bg-white/10
              backdrop-blur
              border border-white/20
              focus:ring-2 focus:ring-purple-400
              focus:border-purple-400
              transition-all duration-200
            "
                type="password"
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />

              <Input
                className="
              bg-white/70 dark:bg-white/10
              backdrop-blur
              border border-white/20
              focus:ring-2 focus:ring-purple-400
              focus:border-purple-400
              transition-all duration-200
            "
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />

              <Input
                className="
              bg-white/70 dark:bg-white/10
              backdrop-blur
              border border-white/20
              focus:ring-2 focus:ring-purple-400
              focus:border-purple-400
              transition-all duration-200
            "
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button className="
              bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500
              text-white
              shadow-lg
              hover:shadow-xl
              transition-all
            "
                onClick={async () => {
                  const result = updatePasswordSchema.safeParse({
                    currentPassword,
                    newPassword,
                    confirmPassword,
                  });

                  if (!result.success) {
                    toast.error(result.error.issues[0].message);
                    return;
                  }

                  try {
                    await handleUpdatePassword(result.data);
                    toast.success("Password updated");
                  } catch {
                    toast.error("Update failed");
                  }
                }}
                disabled={loading}
              >
                Update Password
              </Button>
            </motion.div>
          </Card>
        </motion.div>

        {/* ================= NOTIFICATIONS ================= */}
        <motion.div variants={itemVariants}>
          <Card className={`
          space-y-8 rounded-2xl p-8
          transition-all duration-300
          hover:scale-[1.01] hover:shadow-[0_20px_60px_rgba(99,102,241,0.2)]
          dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]
          ${cardSurface}
        `}>
            <SectionTitle icon={<Bell size={18} />} title="Notifications" />

            <PreferenceRow
              title="In-App Notifications"
              description="Receive reminders inside the app."
              checked={notifications}
              onChange={(value) => {
                setNotifications(value);

                handleUpdatePreferences({
                  notifications: value,
                  emailReminders,
                  emailReminderLeadMinutes,
                  weeklySummary,
                  darkMode,
                });
              }}
            />
            <PreferenceRow
              title="Email Reminders"
              description="Receive email notifications about upcoming reminders."
              checked={emailReminders}
              onChange={(value) => {
                setEmailReminders(value);

                handleUpdatePreferences({
                  notifications,
                  emailReminders: value,
                  emailReminderLeadMinutes,
                  weeklySummary,
                  darkMode,
                });
              }}
            />
            {/* 👇 PLACE THE SELECT HERE */}
            <div
              className={`space-y-2 transition-opacity ${emailReminders
                  ? "opacity-100"
                  : "opacity-50"
                }`}
            >
              <Label>Email Timing</Label>

              <select
                value={emailReminderLeadMinutes}
                disabled={!emailReminders}
                className="w-full rounded-lg border p-2 bg-white dark:bg-zinc-900"
                onChange={(e) => {
                  const minutes = Number(e.target.value);

                  setEmailReminderLeadMinutes(minutes);

                  handleUpdatePreferences({
                    notifications,
                    emailReminders,
                    emailReminderLeadMinutes: minutes,
                    weeklySummary,
                    darkMode,
                  });
                }}
              >
                <option value={0}>At reminder time</option>
                <option value={5}>5 minutes before</option>
                <option value={10}>10 minutes before</option>
                <option value={30}>30 minutes before</option>
              </select>
            </div>
            <PreferenceRow
              title="Weekly Summary"
              description="Get a weekly routine overview"
              checked={weeklySummary}
              onChange={(value) => {
                setWeeklySummary(value);
                handleUpdatePreferences({
                  notifications,
                  emailReminders,
                  emailReminderLeadMinutes,
                  weeklySummary: value,
                  darkMode,
                });
              }}
            />
          </Card>
        </motion.div>

        {/* ================= APPEARANCE ================= */}
        <motion.div variants={itemVariants}>
          <Card className={`
          space-y-8 rounded-2xl p-8
          transition-all duration-300
          hover:scale-[1.01] hover:shadow-[0_20px_60px_rgba(99,102,241,0.2)]
          dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]
          ${cardSurface}
        `}>
            <SectionTitle icon={<Moon size={18} />} title="Appearance" />

            <PreferenceRow
              title="Dark Mode"
              description="Switch between light and dark themes"
              checked={darkMode}
              onChange={(value) => {
                setDarkMode(value);
                handleUpdatePreferences({

                  notifications,

                  emailReminders,

                  emailReminderLeadMinutes,

                  weeklySummary,

                  darkMode: value,
                });
              }}
            />
          </Card>
        </motion.div>

        {/* ================= DANGER ZONE ================= */}
        <motion.div variants={itemVariants}>
          <Card className="
            space-y-6 rounded-2xl border border-red-400/60 bg-gradient-to-br from-rose-200/80 via-orange-100/60 to-amber-100/70 p-8
            shadow-[0_12px_40px_rgba(244,63,94,0.2)] backdrop-blur-xl
            dark:border-red-500/40 dark:from-red-950/50 dark:via-rose-950/40 dark:to-orange-950/30
            dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)]
          ">
            <SectionTitle
              icon={<Trash2 size={18} className="text-red-500" />}
              title="Danger Zone"
            />

            <div className="space-y-4">
              <div>
                <p className="font-medium text-red-600">
                  Delete Account
                </p>
                <p className="text-sm text-neutral-500">
                  This action is permanent and cannot be undone.
                </p>
              </div>

              {/* 🔑 PASSWORD INPUT GOES HERE */}
              <Input
                className="
              bg-white/70 dark:bg-white/10
              backdrop-blur
              border border-white/20
              focus:ring-2 focus:ring-purple-400
              focus:border-purple-400
              transition-all duration-200
            "
                type="password"
                placeholder="Enter password to confirm"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />

              {/* 🔥 BUTTON */}
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button className="
                bg-gradient-to-r from-red-600 via-rose-600 to-orange-600
                text-white
                shadow-lg shadow-rose-500/30
                hover:from-red-500 hover:via-rose-500 hover:to-orange-500
                hover:shadow-xl
                transition-all
              "
                  onClick={async () => {
                    const result = deleteAccountSchema.safeParse({
                      password: deletePassword,
                    });

                    if (!result.success) {
                      toast.error(result.error.issues[0].message);
                      return;
                    }

                    try {
                      await handleDeleteAccount(result.data.password);
                      toast.success("Account deleted");
                    } catch {
                      toast.error("Delete failed");
                    }
                  }}
                  disabled={loading}
                >
                  Delete Account
                </Button>
              </motion.div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ================= UI Helpers ================= */

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <motion.div
        layout
        className="
          rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-600 p-2
          text-white shadow-lg shadow-indigo-500/40 ring-2 ring-white/25
          dark:shadow-fuchsia-500/25
        "
      >
        {icon}
      </motion.div>
      <h2 className="text-lg font-semibold tracking-wide text-neutral-900 dark:text-neutral-50">
        {title}
      </h2>
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-sm text-neutral-600 dark:text-neutral-400">{children}</p>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="
        w-20 h-20 rounded-full
        bg-gradient-to-br from-indigo-500 to-pink-500
        text-white
        flex items-center justify-center
        text-2xl font-bold
        shadow-xl
        transition hover:scale-110
      ">
      {name[0]}
    </div>
  );
}

function PreferenceRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <motion.div
      className="flex items-center justify-between gap-4 rounded-xl border border-indigo-200/40 bg-gradient-to-r from-white/50 to-violet-50/40 px-4 py-3 dark:border-white/10 dark:from-white/5 dark:to-violet-950/30"
      whileHover={{ scale: 1.008 }}
    >
      <div>
        <p className="font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {description}
        </p>
      </div>
      <motion.div whileTap={{ scale: 0.9 }}>
        <Switch checked={checked} onCheckedChange={onChange} />
      </motion.div>
    </motion.div>
  );
}
