"use client";

import { apiClient } from "@/lib/api-client";
import { ApiClientProvider } from "@repo/api-hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, type ReactNode } from "react";

export default function Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ApiClientProvider client={apiClient}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ApiClientProvider>
    </ThemeProvider>
  );
}
