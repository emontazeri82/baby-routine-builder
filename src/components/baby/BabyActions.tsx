"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MoreVertical,
  Pencil,
  Trash2,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";

export default function BabyActions({ babyId }: { babyId: string }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const router = useRouter();
  const triggerRef = useRef<HTMLDivElement>(null);

  // ✅ Position calculation
  function updatePosition() {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();

    const menuWidth = 192; // w-48
    const spacing = 8;

    let left = rect.right - menuWidth;
    let top = rect.bottom + spacing;

    // prevent overflow right
    if (left < 8) left = 8;

    // prevent overflow bottom
    if (top > window.innerHeight - 200) {
      top = rect.top - 160;
    }

    setPosition({ top, left });
  }

  // ✅ Open logic
  useEffect(() => {
    if (open) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition);
    }

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [open]);

  // ✅ Close on outside click + ESC
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={triggerRef} className="relative">
      {/* TRIGGER */}
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="hover:bg-neutral-100 dark:hover:bg-white/10"
      >
        <MoreVertical className="w-4 h-4" />
      </Button>

      {/* PORTAL MENU */}
      {typeof window !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: "fixed",
                  top: position.top,
                  left: position.left,
                }}
                className="
                  z-[9999] w-48
                  rounded-xl border border-white/20
                  bg-white/90 dark:bg-neutral-900/90
                  backdrop-blur-xl shadow-xl
                  p-2
                "
              >
                <MenuItem
                  icon={<LayoutDashboard className="w-4 h-4" />}
                  label="View Dashboard"
                  onClick={() => {
                    router.push(`/dashboard/${babyId}`);
                    setOpen(false);
                  }}
                />

                <MenuItem
                  icon={<Pencil className="w-4 h-4" />}
                  label="Edit"
                  onClick={() => {
                    router.push(`/dashboard/babies/${babyId}/edit`);
                    setOpen(false);
                  }}
                />

                <MenuItem
                  icon={<Trash2 className="w-4 h-4" />}
                  label="Delete"
                  danger
                  onClick={() => {
                    console.log("delete", babyId);
                    setOpen(false);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}

/* ---------- Menu Item ---------- */

function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm transition
        ${
          danger
            ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            : "hover:bg-neutral-100 dark:hover:bg-white/10"
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}