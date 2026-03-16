import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/* =========================
   TYPES
========================= */

export type NotificationSeverity =
  | "success"
  | "info"
  | "warning"
  | "critical";

export interface AppNotification {
  id: string;
  reminderId?: string;
  occurrenceId?: string | null;
  activityTypeId?: string | null;
  reminderStatus?: "active" | "paused" | "cancelled" | null;
  scheduleType?: "one-time" | "recurring" | "interval" | null;
  currentState?:
    | "cancelled"
    | "overdue"
    | "snoozed"
    | "completed"
    | "skipped"
    | "last_completed"
    | "last_skipped"
    | "upcoming"
    | null;
  hasDueOccurrence?: boolean;
  dueOccurrenceCount?: number;
  category: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  actionUrl?: string;
  createdAt?: string;
  scheduledFor?: string;
  status?: string;
  attempts?: number | null;
  errorMessage?: string | null;
  readAt?: string | null;
  isRead?: boolean;
}

/* =========================
   STATE
========================= */

interface NotificationState {
  items: AppNotification[];
  unreadCount: number;
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
};

/* =========================
   SLICE
========================= */

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setNotifications(
      state,
      action: PayloadAction<
        AppNotification[] | { items: AppNotification[]; unreadCount: number }
      >
    ) {
      if (Array.isArray(action.payload)) {
        state.items = action.payload;
        state.unreadCount = action.payload.filter((n) => !n.isRead).length;
        return;
      }

      state.items = action.payload.items;
      state.unreadCount = action.payload.unreadCount;
    },

    addNotification(
      state,
      action: PayloadAction<AppNotification>
    ) {
      const exists = state.items.find(
        (n) => n.id === action.payload.id
      );

      if (!exists) {
        state.items.unshift(action.payload);
      }
    },

    markAsRead(
      state,
      action: PayloadAction<string>
    ) {
      const notification = state.items.find(
        (n) => n.id === action.payload
      );

      if (notification) {
        if (!notification.isRead && state.unreadCount > 0) {
          state.unreadCount -= 1;
        }
        notification.isRead = true;
      }
    },

    markAllRead(state) {
      state.items = state.items.map((n) => ({
        ...n,
        isRead: true,
      }));
      state.unreadCount = 0;
    },

    dismissNotification(
      state,
      action: PayloadAction<string>
    ) {
      state.items = state.items.filter(
        (n) => n.id !== action.payload
      );
    },

    clearAll(state) {
      state.items = [];
      state.unreadCount = 0;
    },
  },
});

export const {
  setNotifications,
  addNotification,
  markAsRead,
  markAllRead,
  dismissNotification,
  clearAll,
} = notificationSlice.actions;

export default notificationSlice.reducer;
