"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Polyfill window.matchMedia for environments (like headless tests or specific preview engines) where it is missing or incomplete
if (typeof window !== "undefined") {
  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  } else {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = (query) => {
      const mql = originalMatchMedia(query);
      if (mql && !mql.addListener) {
        mql.addListener = () => {};
      }
      if (mql && !mql.removeListener) {
        mql.removeListener = () => {};
      }
      return mql;
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
