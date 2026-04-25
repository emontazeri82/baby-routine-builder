"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { generateAssistantRules } from "@/lib/assistant/assistant.rules/index";
import { buildDerivedState } from "@/lib/assistant/buildDerivedState";

import type { AssistantMessage } from "@/lib/assistant/assistant.types";
import AssistantButton from "./AssistantButton";
import AssistantViewDrawer from "./AssistantViewDrawer";

type ActivityLike = {
  id: string;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  activityName?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ReminderLike = Record<string, unknown>;

type SmartAssistantBarProps = {
  babyId: string;
  activities?: ActivityLike[];
  reminders?: ReminderLike[];
  onQuickLog?: (message: AssistantMessage) => void | Promise<void>;
};

type RoutedAssistantMessage = AssistantMessage & {
  route?: string;
};

const MAX_EXPANDED_MESSAGES = 10;

export default function SmartAssistantBar({
  babyId,
  activities,
  reminders,
  onQuickLog,
}: SmartAssistantBarProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ready">("loading");
  const [messages, setMessages] = useState<RoutedAssistantMessage[]>([]);
  const lastShownMapRef = useRef<Record<string, number>>({});
  const [viewMessage, setViewMessage] = useState<AssistantMessage | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!expanded) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (viewMessage !== null) {
        setViewMessage(null);
      } else {
        setExpanded(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded, viewMessage]);

  useEffect(() => {
    if (!expanded) {
      setViewMessage(null);
    }
  }, [expanded]);

  useEffect(() => {
    let cancelled = false;

    setLoadState("loading");

    async function loadMessages() {
      try {
        const state = buildDerivedState({
          activities: activities ?? [],
          reminders: reminders ?? [],
        });

        const rulesOutput = await generateAssistantRules({
          ...state,
          babyId,
          lastShownMap: lastShownMapRef.current,
        });

        if (process.env.NODE_ENV === "development") {
          console.log("[Assistant] Derived State:", state);
          console.log(
            "[Assistant] Open activities seen by assistant:",
            state.openActivities.map((activity) => ({
              id: activity.id,
              activityName: activity.activityName,
              startTime: activity.startTime,
              endTime: activity.endTime,
            }))
          );
          console.log(
            "[Assistant] Rules Output:",
            rulesOutput.map((message, index) => ({
              rank: index + 1,
              id: message.id,
              type: message.type,
              priority: message.priority,
              score: message.score,
              title: message.title,
            }))
          );
        }

        if (!cancelled) {
          setMessages(rulesOutput as RoutedAssistantMessage[]);
        }
      } catch (err) {
        console.error("[Assistant] Failed to load suggestions", err);
        if (!cancelled) {
          setMessages([]);
        }
      } finally {
        if (!cancelled) {
          setLoadState("ready");
        }
      }
    }

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [activities, reminders, babyId]);

  const expandedMessages = messages.slice(0, MAX_EXPANDED_MESSAGES);
  const visibleMessages = messages.slice(0, 1);

  return (
    <>
      <div className="w-full space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              Smart Assistant
            </h2>
            <p className="text-xs text-neutral-500">
              {loadState === "loading"
                ? "Updating suggestions…"
                : "Top suggestion for right now"}
            </p>
          </div>

          {loadState === "ready" && messages.length > 1 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              More
            </button>
          )}
        </div>

        <div className="space-y-2 overflow-y-auto max-h-[240px] min-h-[72px]">
          {loadState === "loading" ? (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-neutral-200/90 bg-neutral-50/60 px-3 py-6">
              <p className="text-xs text-neutral-500">Loading suggestions…</p>
            </div>
          ) : !messages.length ? (
            <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/90 px-3 py-3 shadow-sm">
              <p className="text-sm font-medium text-neutral-800">
                Smart Assistant is ready
              </p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                Log feedings, sleep, or diapers — personalized tips will appear
                here.
              </p>
              <button
                type="button"
                onClick={() =>
                  router.push(`/dashboard/${babyId}/activities`)
                }
                className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Open activities
              </button>
            </div>
          ) : (
            visibleMessages.map((message) => (
              <div
                key={message.id}
                className="rounded-xl border border-neutral-200/80 bg-neutral-50/90 px-3 py-2.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium leading-snug text-neutral-900">
                      {message.title}
                    </p>
                    {message.description ? (
                      <p className="text-xs leading-relaxed text-neutral-600">
                        {message.description}
                      </p>
                    ) : null}
                  </div>


                  <AssistantButton
                    message={message}
                    onQuickLog={onQuickLog}
                    router={router}
                    onView={setViewMessage}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {mounted && expanded && messages.length > 0
        ? createPortal(
          <div className="fixed inset-0 z-[9999]">
            <button
              type="button"
              aria-label="Close assistant overlay"
              onClick={() => {
                setExpanded(false);
                setViewMessage(null);
              }}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            />

            <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
              <div className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.30)]">
                <div className="flex items-center justify-between border-b bg-neutral-50 px-5 py-4">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Smart Assistant
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Showing top {expandedMessages.length} messages
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setExpanded(false);
                      setViewMessage(null);
                    }}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    Show Less
                  </button>
                </div>

                <div className="max-h-[75vh] overflow-y-auto p-4 space-y-2">
                  {expandedMessages.map((message, index) => (
                    <div
                      key={message.id}
                      className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="text-[11px] font-medium text-neutral-400">
                            {index + 1} of {expandedMessages.length}
                          </p>
                          <p className="text-sm font-medium text-neutral-900">
                            {message.title}
                          </p>
                          {message.description ? (
                            <p className="text-xs text-neutral-600">
                              {message.description}
                            </p>
                          ) : null}
                        </div>

                        <AssistantButton
                          message={message}
                          router={router}
                          onQuickLog={onQuickLog}
                          onView={setViewMessage}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
        : null}

      {mounted && viewMessage
        ? createPortal(
            <AssistantViewDrawer
              message={viewMessage}
              activities={activities}
              onClose={() => setViewMessage(null)}
            />,
            document.body
          )
        : null}
    </>
  );
}
