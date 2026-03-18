"use client";

import { useEffect, useState } from "react";
import { subscribe } from "./use-toast";

type Toast = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function Toaster() {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    subscribe((t) => {
      setToast(t);

      setTimeout(() => {
        setToast(null);
      }, 3000);
    });
  }, []);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-white shadow-lg rounded-lg border p-4 max-w-sm">
      {toast.title && (
        <div className="font-semibold">{toast.title}</div>
      )}

      {toast.description && (
        <div className="text-sm text-gray-600">
          {toast.description}
        </div>
      )}
    </div>
  );
}