import axios from "axios";
import { toast } from "sonner";
import { quickLogActivity } from "@/hooks/useQuickLog";

import type { AssistantMessage } from "./assistant.types";

type RouterLike = {
  push: (href: string) => void;
  refresh?: () => void;
};

type AssistantActionParams = {
  message: AssistantMessage;
  router: RouterLike;
  onQuickLog?: (message: AssistantMessage) => void | Promise<void>;
};

// =====================================================
// 🧠 SUCCESS MESSAGES
// =====================================================

function getSuccessMessage(message: AssistantMessage) {
  switch (message.actionType) {
    case "start":
      return `${message.title} started`;
    case "end":
      return "Activity ended";
    case "log":
      return "Logged successfully";
    default:
      return "Done";
  }
}

function resolveNavigateTarget(message: AssistantMessage) {
  const payload = message.actionPayload;
  if (payload?.route) return payload.route;
  if (payload?.babyId) return `/dashboard/${payload.babyId}/activities`;
  return "/dashboard";
}

// =====================================================
// 🚀 MAIN HANDLER
// =====================================================

export async function handleAssistantAction({
  message,
  router,
  onQuickLog,
}: AssistantActionParams): Promise<boolean> {
  try {
    const payload = message.actionPayload;

    // =================================================
    // 🟢 START ACTIVITY
    // =================================================
    if (message.actionType === "start") {
      if (!payload?.activityType || !payload?.babyId) {
        toast.error("Start failed", {
          description: "Missing required data to start activity",
        });
        return false;
      }
      await quickLogActivity({
        babyId: payload.babyId,
        activityTypeName: payload.activityType,
      });

      toast.success(getSuccessMessage(message));
      router.refresh?.();
      return true;
    }

    // =================================================
    // 🔴 END ACTIVITY
    // =================================================
    if (message.actionType === "end") {
      const entityId = payload?.entityId ?? message.entityId;
      if (!entityId) {
        toast.error("End failed", {
          description: "Missing activity reference",
        });
        return false;
      }

      const url = `/api/activities/${entityId}`;

      console.log("[Axios] Calling:", url);

      await axios.patch(url, {
        endTime: new Date().toISOString(),
      });

      toast.success(getSuccessMessage(message));
      router.refresh?.();
      return true;
    }

    // =================================================
    // 🟡 LOG
    // =================================================
    if (message.actionType === "log") {
      if (payload?.activityType && payload?.babyId) {
        await quickLogActivity({
          babyId: payload.babyId,
          activityTypeName: payload.activityType,
        });
        toast.success(getSuccessMessage(message));
        router.refresh?.();
      } else if (onQuickLog) {
        await onQuickLog(message);
        toast.success(getSuccessMessage(message));
      } else {
        router.push(resolveNavigateTarget(message));
      }
      return true;
    }

    // =================================================
    // 🔵 NAVIGATE / VIEW
    // =================================================
    if (
      message.actionType === "navigate" ||
      message.actionType === "view" ||
      message.actionType === "review"
    ) {
      router.push(resolveNavigateTarget(message));
      toast.success(message.actionLabel ?? "Opened");
      return true;
    }

    // =================================================
    // ⚪ NONE
    // =================================================
    if (message.actionType === "none") {
      return false;
    }

    console.warn("[Assistant] Unknown action:", message.actionType);
    return false;
  } catch (err: any) {
    console.error("[Assistant Action Error]", err);

    toast.error("Assistant action failed", {
      description: `Failed to ${message.actionType}. Please try again.`,
    });
    return false;
  }
}
