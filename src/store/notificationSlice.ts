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
  smartState?: "critical" | "missed" | "now" | "upcoming";
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

  // ✅ NEW (for grouping)
  count?: number;
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
   HELPERS
========================= */

const isFuture = (n: AppNotification) => {
  if (!n.scheduledFor) return false;
  return new Date(n.scheduledFor) >= new Date();
};

const normalizeNotification = (n: AppNotification): AppNotification => ({
  ...n,
  isRead: n.isRead ?? Boolean(n.readAt), // 🔥 sync readAt → isRead
});

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
      let items: AppNotification[] = [];

      if (Array.isArray(action.payload)) {
        items = action.payload.map(normalizeNotification);
      } else {
        items = action.payload.items.map(normalizeNotification);
      }

      state.items = items;

      // 🔥 FIXED unread logic (future only)
      state.unreadCount = items.filter(
        (n) => !n.isRead && isFuture(n)
      ).length;
    },

    addNotification(
      state,
      action: PayloadAction<AppNotification>
    ) {
      const newItem = normalizeNotification(action.payload);

      const exists = state.items.find(
        (n) => n.id === newItem.id
      );

      if (!exists) {
        state.items.unshift(newItem);

        if (!newItem.isRead && isFuture(newItem)) {
          state.unreadCount += 1;
        }
      }
    },

    markAsRead(
      state,
      action: PayloadAction<string>
    ) {
      const notification = state.items.find(
        (n) => n.id === action.payload
      );

      if (notification && !notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date().toISOString();

        if (isFuture(notification) && state.unreadCount > 0) {
          state.unreadCount -= 1;
        }
      }
    },

    markAllRead(state) {
      state.items = state.items.map((n) => ({
        ...n,
        isRead: true,
        readAt: new Date().toISOString(),
      }));

      state.unreadCount = 0;
    },

    dismissNotification(
      state,
      action: PayloadAction<string>
    ) {
      const toRemove = state.items.find(
        (n) => n.id === action.payload
      );

      if (toRemove && !toRemove.isRead && isFuture(toRemove)) {
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }

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