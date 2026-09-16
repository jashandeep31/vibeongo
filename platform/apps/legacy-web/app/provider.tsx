"use client";

import NavCommandBox from "@/components/nav-command-box";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export const queryClient = new QueryClient();

export default function Provider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <QueryClientProvider client={queryClient}>
        <>
          <NavCommandBox />
          {children}
        </>
      </QueryClientProvider>
    </NextThemesProvider>
  );
}
