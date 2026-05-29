"use client";

import NavCommandBox from "@/components/nav-command-box";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

export const queryClient = new QueryClient();

export default function Provider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <>
        <NavCommandBox />
        {children}
      </>
    </QueryClientProvider>
  );
}
