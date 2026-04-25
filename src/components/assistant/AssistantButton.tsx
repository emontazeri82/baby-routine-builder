"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Play,
  Square,
  PlusCircle,
  Eye,
  ArrowRight,
} from "lucide-react";

import { handleAssistantAction } from "@/lib/assistant/assistant.actions";
import type { AssistantMessage } from "@/lib/assistant/assistant.types";

/** Rules + insight adapter often use `navigate` + label "Review" instead of actionType `review`. */
function shouldOpenAssistantDrawer(message: AssistantMessage): boolean {
  const label = (message.actionLabel ?? "").toLowerCase();
  const labelSuggestsReview = label.includes("review");

  return (
    message.actionType === "view" ||
    message.actionType === "review" ||
    (message.actionType === "navigate" && labelSuggestsReview)
  );
}

type Props = {
  message: AssistantMessage;
  router: any;
  onQuickLog?: (message: AssistantMessage) => void | Promise<void>;
  onComplete?: () => void;
  /** When set (e.g. expanded modal), view/review opens the detail drawer instead of doing nothing in the preview strip. */
  onView?: (message: AssistantMessage) => void;
};

// 🎯 ICON MAP
function getIcon(message: AssistantMessage) {
  switch (message.actionType) {
    case "start":
      return <Play className="h-4 w-4" />;
    case "end":
      return <Square className="h-4 w-4" />;
    case "log":
      return <PlusCircle className="h-4 w-4" />;
    case "view":
    case "review":
      return <Eye className="h-4 w-4" />;
    case "navigate":
      return <ArrowRight className="h-4 w-4" />;
    default:
      return null;
  }
}

function getColorClass(message: AssistantMessage) {
  switch (message.actionType) {
    case "start":
      return "!bg-blue-600 !text-white hover:!bg-blue-700 !border-transparent";

    case "end":
      return "!bg-red-600 !text-white hover:!bg-red-700 !border-transparent";

    case "log":
      return "!bg-emerald-600 !text-white hover:!bg-emerald-700 !border-transparent";

    case "view":
    case "review":
    case "navigate":
      return "!bg-indigo-600 !text-white hover:!bg-indigo-700 !border-transparent";

    default:
      return "!bg-slate-500 !text-white hover:!bg-slate-600 !border-transparent";
  }
}

export default function AssistantButton({
  message,
  router,
  onQuickLog,
  onComplete,
  onView,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;

    const wantsDrawer = shouldOpenAssistantDrawer(message);

    if (wantsDrawer && onView) {
      onView(message);
      return;
    }

    // Preview strip: view/review types still have no handler without onView.
    // navigate + "Review…" falls through so handleAssistantAction can router.push.
    if (wantsDrawer && !onView && message.actionType !== "navigate") {
      return;
    }

    setLoading(true);

    const didComplete = await handleAssistantAction({
      message,
      router,
      onQuickLog,
    });

    setLoading(false);

    if (didComplete) {
      onComplete?.();
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      variant="default"
      className={`
          gap-2
          transition-all duration-150
          hover:scale-[1.01]
          active:scale-[0.97]
          shadow-sm
          focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
          ${getColorClass(message)}
        `}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        getIcon(message)
      )}

      {loading ? "Processing..." : message.actionLabel}
    </Button>
  );
}