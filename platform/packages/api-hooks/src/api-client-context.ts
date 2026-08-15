"use client";

import type { ApiClient } from "@repo/api-client";
import {
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from "react";

const ApiClientContext = createContext<ApiClient | null>(null);

export function ApiClientProvider({
  client,
  children,
}: {
  client: ApiClient;
  children: ReactNode;
}) {
  return createElement(ApiClientContext.Provider, { value: client }, children);
}

export function useApiClient() {
  const client = useContext(ApiClientContext);
  if (!client) throw new Error("ApiClientProvider is missing");
  return client;
}
