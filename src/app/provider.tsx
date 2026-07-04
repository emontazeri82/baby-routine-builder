"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "@/store/store";

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

const QUERY_CACHE_KEY_PREFIX = "baby-routine-builder-query-cache";
const LEGACY_QUERY_CACHE_KEY = "baby-routine-builder-query-cache";
const ONE_MINUTE = 60 * 1000;
const ONE_DAY = 24 * 60 * ONE_MINUTE;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2 * ONE_MINUTE,
        gcTime: ONE_DAY,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 1,
      },
    },
  });
}

function createLocalStoragePersister(cacheKey: string) {
  return createSyncStoragePersister({
    key: cacheKey,
    storage:
      typeof window === "undefined" ? undefined : window.localStorage,
    throttleTime: 1000,
  });
}

function clearPersistedQueryCaches() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(LEGACY_QUERY_CACHE_KEY);

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(`${QUERY_CACHE_KEY_PREFIX}:`)) {
      window.localStorage.removeItem(key);
    }
  }
}

function QueryProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [queryClient] = useState(createQueryClient);
  const previousUserIdRef = useRef<string | null>(null);
  const userId = session?.user?.id ?? null;
  const cacheKey = userId
    ? `${QUERY_CACHE_KEY_PREFIX}:${userId}`
    : `${QUERY_CACHE_KEY_PREFIX}:anonymous`;
  const persister = useMemo(
    () => createLocalStoragePersister(cacheKey),
    [cacheKey]
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      queryClient.clear();
      clearPersistedQueryCaches();
      previousUserIdRef.current = null;
      return;
    }

    if (
      status === "authenticated" &&
      previousUserIdRef.current &&
      previousUserIdRef.current !== userId
    ) {
      queryClient.clear();
    }

    if (status === "authenticated") {
      previousUserIdRef.current = userId;
    }
  }, [queryClient, status, userId]);

  return (
    <PersistQueryClientProvider
      key={cacheKey}
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: ONE_DAY,
        buster: userId ?? "anonymous",
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === "success",
        },
      }}
    >
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
    </PersistQueryClientProvider>
  );
}

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReduxProvider store={store}>
      <SessionProvider>
        <QueryProviders>{children}</QueryProviders>
      </SessionProvider>
    </ReduxProvider>
  );
}
