"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Polyfill window.matchMedia for environments (like headless tests or specific preview engines) where it is missing or incomplete
if (typeof window !== "undefined") {
  const safeMatchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });

  if (!window.matchMedia) {
    window.matchMedia = safeMatchMedia as any;
  } else {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = (query) => {
      try {
        const mql = originalMatchMedia(query);
        if (!mql) {
          return safeMatchMedia(query) as any;
        }
        if (!mql.addListener) {
          mql.addListener = () => {};
        }
        if (!mql.removeListener) {
          mql.removeListener = () => {};
        }
        return mql;
      } catch (e) {
        return safeMatchMedia(query) as any;
      }
    };
  }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
