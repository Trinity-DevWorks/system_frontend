"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/queryStaleTime";
import { useState } from "react";

export default function Providers({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: QUERY_STALE_TIME.default,
            gcTime: QUERY_GC_TIME,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
