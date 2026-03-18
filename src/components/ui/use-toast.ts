"use client";

import { useState } from "react";

type Toast = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

let listeners: ((toast: Toast) => void)[] = [];

export function toast(toast: Toast) {
  listeners.forEach((listener) => listener(toast));
}

export function useToast() {
  return {
    toast,
  };
}

export function subscribe(listener: (toast: Toast) => void) {
  listeners.push(listener);
}