"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  Bell,
  Moon,
  Trash2,
  Upload,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">

      {/* ================= HEADER ================= */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-4xl font-bold tracking-tight">
          Account Settings
        </h1>
        <p className="text-neutral-500 mt-2">
          Manage your account, security, and preferences
        </p>
      </motion.div>

      {/* ================= PROFILE ================= */}
      <Card className="p-8 space-y-8">
        <SectionTitle icon={<User size={18} />} title="Profile Information" />

        <div className="flex items-center gap-6">
          <Avatar name={user?.name || "U"} />

          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Change Avatar
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label>Name</Label>
            <Input defaultValue={user?.name || ""} />
          </div>

          <div>
            <Label>Email</Label>
            <div className="relative">
              <Input defaultValue={user?.email || ""} disabled />
              <Badge className="absolute right-3 top-2 text-xs">
                Verified
              </Badge>
            </div>
          </div>
        </div>

        <Button>Save Changes</Button>
      </Card>

      {/* ================= SECURITY ================= */}
      <Card className="p-8 space-y-8">
        <SectionTitle icon={<Lock size={18} />} title="Security" />

        <div className="grid gap-4">
          <Input type="password" placeholder="Current Password" />
          <Input type="password" placeholder="New Password" />
          <Input type="password" placeholder="Confirm New Password" />
        </div>

        <Button>Update Password</Button>
      </Card>

      {/* ================= NOTIFICATIONS ================= */}
      <Card className="p-8 space-y-8">
        <SectionTitle icon={<Bell size={18} />} title="Notifications" />

        <PreferenceRow
          title="Email Reminders"
          description="Receive email notifications about upcoming reminders"
          checked={notifications}
          onChange={setNotifications}
        />

        <PreferenceRow
          title="Weekly Summary"
          description="Get a weekly routine overview"
          checked={true}
          onChange={() => {}}
        />
      </Card>

      {/* ================= APPEARANCE ================= */}
      <Card className="p-8 space-y-8">
        <SectionTitle icon={<Moon size={18} />} title="Appearance" />

        <PreferenceRow
          title="Dark Mode"
          description="Switch between light and dark themes"
          checked={darkMode}
          onChange={setDarkMode}
        />
      </Card>

      {/* ================= DANGER ZONE ================= */}
      <Card className="p-8 space-y-6 border border-red-200 bg-red-50/30">
        <SectionTitle
          icon={<Trash2 size={18} className="text-red-500" />}
          title="Danger Zone"
        />

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-red-600">
              Delete Account
            </p>
            <p className="text-sm text-neutral-500">
              This action is permanent and cannot be undone.
            </p>
          </div>

          <Button variant="destructive">
            Delete Account
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ================= UI Helpers ================= */

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-neutral-500">{icon}</div>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-neutral-500 mb-2">{children}</p>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-20 h-20 rounded-full bg-neutral-200 flex items-center justify-center text-2xl font-bold">
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
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-neutral-500">
          {description}
        </p>
      </div>

      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
