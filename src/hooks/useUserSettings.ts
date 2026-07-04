import { useState } from "react";
import {
  updateProfile,
  updatePassword,
  updatePreferences,
  deleteAccount,
} from "@/lib/settings/user-settings";

export function useUserSettings() {
  const [loading, setLoading] = useState(false);

  /* ---------------- Profile ---------------- */
  const handleUpdateProfile = async (data: { name: string }) => {
    try {
      setLoading(true);
      console.log("[Settings] Updating profile", data);

      await updateProfile(data.name); // ✅ FIX

    } catch (err) {
      console.error("[Settings] Profile error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Password ---------------- */
  const handleUpdatePassword = async (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    try {
      setLoading(true);
      console.log("[Settings] Updating password");

      await updatePassword(data); // ✅ already correct

    } catch (err) {
      console.error("[Settings] Password error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Preferences ---------------- */
  /* ---------------- Preferences ---------------- */
  const handleUpdatePreferences = async (data: {
    notifications: boolean;
    emailReminders: boolean;
    emailReminderLeadMinutes: number;
    weeklySummary: boolean;
    darkMode: boolean;
  }) => {
    try {
      setLoading(true);

      console.log("[Settings] Updating preferences", data);

      await updatePreferences({
        inAppNotificationsEnabled: data.notifications,
        emailRemindersEnabled: data.emailReminders,
        emailReminderLeadMinutes: data.emailReminderLeadMinutes,
        weeklySummaryEnabled: data.weeklySummary,
        darkMode: data.darkMode,
      });
    } catch (err) {
      console.error("[Settings] Preferences error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Delete ---------------- */
  const handleDeleteAccount = async (password: string) => {
    try {
      setLoading(true);
      console.log("[Settings] Deleting account");

      await deleteAccount(password); // ✅ FIX

    } catch (err) {
      console.error("[Settings] Delete error:", err);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleUpdateProfile,
    handleUpdatePassword,
    handleUpdatePreferences,
    handleDeleteAccount,
  };
}