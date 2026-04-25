"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import SmartAssistantBar from "./SmartAssistantBar";

export default function AssistantOverlay({
  babyId,
  activities,
  reminders,
}: any) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    setPosition({
      x: Math.max(16, window.innerWidth - 376),
      y: 96,
    });
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const onResize = () => {
      setPosition((current) => ({
        x: Math.min(Math.max(16, current.x), Math.max(16, window.innerWidth - 336)),
        y: Math.min(Math.max(16, current.y), Math.max(16, window.innerHeight - 180)),
      }));
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mounted]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;

      setPosition({
        x: Math.min(
          Math.max(16, dragState.initialX + event.clientX - dragState.startX),
          Math.max(16, window.innerWidth - 336)
        ),
        y: Math.min(
          Math.max(16, dragState.initialY + event.clientY - dragState.startY),
          Math.max(16, window.innerHeight - 180)
        ),
      });
    };

    const onPointerUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed z-[200] w-[320px] max-w-[calc(100vw-2rem)]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="min-h-[120px] overflow-hidden rounded-2xl bg-white/80 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-md">
        <div
          onPointerDown={(event) => {
            event.preventDefault();
            dragStateRef.current = {
              startX: event.clientX,
              startY: event.clientY,
              initialX: position.x,
              initialY: position.y,
            };
          }}
          className="flex h-8 cursor-grab items-center justify-center bg-transparent touch-none active:cursor-grabbing"
          aria-hidden="true"
        >
          <div className="h-1.5 w-10 rounded-full bg-neutral-300/70" />
        </div>

        <SmartAssistantBar
          babyId={babyId}
          activities={activities}
          reminders={reminders}
        />
      </div>
    </div>,
    document.body
  );
}