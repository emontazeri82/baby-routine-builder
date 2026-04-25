"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import Link from "next/link";

type Props = {
  babyId: string;
};

/** Above Smart Assistant overlay (`z-[200]`). Single layer avoids stacking bugs. */
const NAV_LAYER_Z = 250;

/** Snappy overlay — long animations feel sluggish on mobile. */
const SNAP = {
  enter: { duration: 0.07, ease: [0.25, 0.1, 0.25, 1] as const },
  exit: { duration: 0.06, ease: [0.4, 0, 1, 1] as const },
};

export default function MobileHamburger({ babyId }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggle = () => setOpen((p) => !p);
  const close = () => setOpen(false);

  // Before paint — portal ready same tick as layout (faster than useEffect).
  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (
        buttonRef.current?.contains(t) ||
        menuRef.current?.contains(t)
      ) {
        return;
      }
      close();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = () => setOpen(false);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="mobile-nav-dropdown"
        aria-label={open ? "Close menu" : "Open navigation menu"}
        onClick={toggle}
        className="relative z-[70] mr-3 flex h-10 w-10 shrink-0 items-center justify-center lg:hidden"
      >
        ☰
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence mode="sync">
            {open && (
              <motion.div
                key="mobile-nav-root"
                role="presentation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={SNAP.enter}
                className="fixed inset-0 lg:hidden will-change-[opacity]"
                style={{ zIndex: NAV_LAYER_Z }}
              >
                {/* Dim layer — no backdrop-blur (expensive on low-end phones) */}
                <button
                  type="button"
                  aria-label="Close menu"
                  className="absolute inset-0 bg-black/45"
                  onClick={close}
                />

                {/* Panel */}
                <motion.div
                  ref={menuRef}
                  id="mobile-nav-dropdown"
                  role="menu"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={SNAP.enter}
                  className="pointer-events-auto absolute left-4 top-16 max-h-[min(70vh,calc(100dvh-5rem))] w-64 overflow-y-auto overscroll-contain rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl will-change-transform"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MenuItem href={`/dashboard/${babyId}`} close={close}>
                    Dashboard
                  </MenuItem>
                  <MenuItem href="/dashboard/babies" close={close}>
                    Babies
                  </MenuItem>
                  <MenuItem href={`/dashboard/${babyId}/activities`} close={close}>
                    Activity
                  </MenuItem>
                  <MenuItem href={`/dashboard/${babyId}/reminders`} close={close}>
                    Reminders
                  </MenuItem>
                  <MenuItem href={`/dashboard/${babyId}/calendar`} close={close}>
                    Calendar
                  </MenuItem>
                  <MenuItem href={`/dashboard/${babyId}/analytics`} close={close}>
                    Analytics
                  </MenuItem>
                  <MenuItem href="/dashboard/settings" close={close}>
                    Settings
                  </MenuItem>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

function MenuItem({
  href,
  children,
  close,
}: {
  href: string;
  children: React.ReactNode;
  close: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={close}
      className="
        block rounded-lg px-4 py-2 font-medium text-gray-800 transition-colors duration-100
        hover:bg-gradient-to-r hover:from-indigo-500 hover:to-pink-500 hover:text-white
      "
    >
      {children}
    </Link>
  );
}
