"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  markAllRead,
} from "@/store/notificationSlice";
import { RefreshCw } from "lucide-react";
import NotificationList from "./NotificationList";

export default function NotificationDrawer({
  babyId,
  open,
  onOpenChange,
  onRefresh,
}: {
  babyId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onRefresh?: () => Promise<void> | void;
}) {
  const dispatch = useAppDispatch();

  const notifications = useAppSelector(
    (s) => s.notifications.items
  );

  const unread = notifications.filter((n) => !n.isRead);
  const critical = notifications.filter(
    (n) => n.severity === "critical"
  );
  const actionable = notifications.filter(
    (n) => n.reminderStatus === "active" && n.hasDueOccurrence
  );
  const insights = notifications.filter(
    (n) => n.category !== "reminder"
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-md flex flex-col"
      >
        <SheetHeader className="border-b pb-3">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle>Notifications</SheetTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => void onRefresh?.()}
              aria-label="Refresh notifications"
              title="Refresh notifications"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <SheetDescription>
            Your recent alerts and reminders
          </SheetDescription>
        </SheetHeader>

        <Tabs
          defaultValue="actionable"
          className="mt-3 flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="grid w-full grid-cols-5 gap-1">
            <TabsTrigger value="actionable" className="px-2 text-xs leading-none truncate">
              Actionable ({actionable.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="px-2 text-xs leading-none truncate">
              Unread ({unread.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="px-2 text-xs leading-none truncate">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="insights" className="px-2 text-xs leading-none truncate">
              Insights ({insights.length})
            </TabsTrigger>
            <TabsTrigger value="critical" className="px-2 text-xs leading-none truncate">
              Critical ({critical.length})
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-md border bg-background">
            <ScrollArea className="h-full px-4">
              <TabsContent value="actionable" className="m-0">
                <NotificationList
                  notifications={actionable}
                  babyId={babyId}
                  onRefresh={onRefresh}
                />
              </TabsContent>

              <TabsContent value="unread" className="m-0">
                <NotificationList
                  notifications={unread}
                  babyId={babyId}
                  onRefresh={onRefresh}
                />
              </TabsContent>

              <TabsContent value="all" className="m-0">
                <NotificationList
                  notifications={notifications}
                  babyId={babyId}
                  onRefresh={onRefresh}
                />
              </TabsContent>

              <TabsContent value="insights" className="m-0">
                <NotificationList
                  notifications={insights}
                  babyId={babyId}
                  onRefresh={onRefresh}
                />
              </TabsContent>

              <TabsContent value="critical" className="m-0">
                <NotificationList
                  notifications={critical}
                  babyId={babyId}
                  onRefresh={onRefresh}
                />
              </TabsContent>
            </ScrollArea>
          </div>
        </Tabs>

        <div className="flex justify-between border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={unread.length === 0}
            onClick={async () => {
              try {
                const res = await fetch(
                  `/api/notifications/read-all?babyId=${babyId}`,
                  { method: "PATCH" }
                );
                if (!res.ok) return;
                dispatch(markAllRead());
                if (onRefresh) await onRefresh();
              } catch (error) {
                console.error("Failed to mark all notifications read", error);
              }
            }}
          >
            Mark all read
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void onRefresh?.()}
          >
            Refresh
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
