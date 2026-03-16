"use client";

import { useState } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "@/store/store";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  // React Query client (stable instance)
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}

          <Toaster
            position="top-right"
            richColors
            closeButton
            expand
          />
        </ThemeProvider>
      </QueryClientProvider>
    </ReduxProvider>
  );
}
