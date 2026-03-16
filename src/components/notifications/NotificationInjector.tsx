
"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import { setNotifications } from "@/store/notificationSlice";
import { AppNotification } from "@/store/notificationSlice";

export default function NotificationInjector({
  notifications,
  babyId,
}: {
  notifications: AppNotification[];
  babyId: string;
}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      setNotifications({
        items: notifications,
        unreadCount: notifications.filter((n) => !n.isRead).length,
      })
    );
  }, [notifications, babyId, dispatch]);

  return null;
}
