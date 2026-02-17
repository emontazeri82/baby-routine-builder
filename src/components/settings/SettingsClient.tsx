"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Upload } from "lucide-react";

type User = {
  id: string;
  name?: string | null;
  email?: string | null;
};

export default function SettingsClient({ user }: { user: User }) {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="p-8 space-y-10 max-w-4xl mx-auto">
      
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-neutral-500 mt-1">
          Manage your account and preferences
        </p>
      </motion.div>

      {/* PROFILE CARD */}
      <Card className="p-6 space-y-6">
        <SectionHeader title="Profile" />

        <div className="flex items-center gap-6">
          <Avatar name={user.name || "U"} />

          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Upload Avatar
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Input defaultValue={user.name || ""} placeholder="Full Name" />
          <Input defaultValue={user.email || ""} disabled />
        </div>

        <Button>Save Changes</Button>
      </Card>

      {/* SECURITY */}
      <Card className="p-6 space-y-6">
        <SectionHeader title="Security" />

        <div className="space-y-4">
          <Input type="password" placeholder="Current Password" />
          <Input type="password" placeholder="New Password" />
          <Input type="password" placeholder="Confirm New Password" />
        </div>

        <Button>Update Password</Button>
      </Card>

      {/* PREFERENCES */}
      <Card className="p-6 space-y-6">
        <SectionHeader title="Preferences" />

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Email Notifications</p>
            <p className="text-sm text-neutral-500">
              Receive updates about reminders
            </p>
          </div>

          <Switch
            checked={notifications}
            onCheckedChange={setNotifications}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Dark Mode</p>
            <p className="text-sm text-neutral-500">
              Toggle application theme
            </p>
          </div>

          <Switch
            checked={darkMode}
            onCheckedChange={setDarkMode}
          />
        </div>
      </Card>

      {/* ACCOUNT SECTION */}
      <Card className="p-6 space-y-6 border-red-200">
        <SectionHeader title="Account" />

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Delete Account</p>
            <p className="text-sm text-neutral-500">
              Permanently delete your account and data
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent>
              <DropdownMenuItem className="text-red-600">
                Confirm Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
    </div>
  );
}

/* ---------- Small Components ---------- */

function SectionHeader({ title }: { title: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="h-px bg-neutral-200 mt-2" />
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center text-xl font-semibold">
      {name[0]}
    </div>
  );
}
