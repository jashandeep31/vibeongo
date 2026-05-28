"use client";

import NavCommandBox from "@/components/nav-command-box";
import { SecondaryCommandbox } from "@/components/project-sessions/secondary-command-box";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

export const queryClient = new QueryClient();

export default function Provider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <>
        <NavCommandBox />
        <SecondaryCommandbox />
        {children}
      </>
    </QueryClientProvider>
  );
}
