import axios from "axios";

/* ---------------- Profile ---------------- */
export const updateProfile = (name: string) =>
  axios.post("/api/user/update-profile", { name });

/* ---------------- Password ---------------- */
export const updatePassword = (data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) =>
  axios.post("/api/user/update-password", data);

/* ---------------- Preferences ---------------- */
export const updatePreferences = (data: {
  inAppNotificationsEnabled?: boolean;
  emailRemindersEnabled?: boolean;
  emailReminderLeadMinutes?: number;
  weeklySummaryEnabled?: boolean;
  darkMode?: boolean;
}) =>
  axios.patch("/api/user/preferences", data);

/* ---------------- Delete ---------------- */
export const deleteAccount = (password: string) =>
  axios.post("/api/user/delete", { password });
