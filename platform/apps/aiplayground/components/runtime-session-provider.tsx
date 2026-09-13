"use client";

import { useGetInstances } from "@repo/api-hooks";
import { useSessionsStore } from "@repo/app-store";
import { createContext, useContext, type ReactNode } from "react";

import { useWebTerminalWorkspaceSocket } from "@/hooks/use-web-terminal-workspace-socket";

type RuntimeSessionContextValue = ReturnType<
  typeof useWebTerminalWorkspaceSocket
>;

const RuntimeSessionContext = createContext<RuntimeSessionContextValue | null>(
  null,
);

function getLocalToken(config: unknown) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return "";
  const token = (config as Record<string, unknown>).vibeongoLocalToken;
  return typeof token === "string" ? token : "";
}

export function RuntimeSessionProvider({
  children,
  projectSessionId,
}: {
  children: ReactNode;
  projectSessionId: string;
}) {
  const storedInstance = useSessionsStore(
    (store) =>
      store.sessions.find((entry) => entry.session.id === projectSessionId)
        ?.instance,
  );
  const instancesQuery = useGetInstances(
    { limit: 1, sessionId: projectSessionId, state: "running" },
    !storedInstance,
  );
  const instance = storedInstance ?? instancesQuery.data?.data[0];
  const runtimeUrl = instance
    ? `https://3101-${instance.id}${instance.proxy_domain}`
    : "";
  const localToken = getLocalToken(instance?.config);
  const accessToken = instance?.access_token ?? "";
  const runtime = useWebTerminalWorkspaceSocket({
    accessToken,
    enabled: Boolean(runtimeUrl && localToken && accessToken),
    localToken,
    runtimeUrl,
  });

  return (
    <RuntimeSessionContext.Provider value={runtime}>
      {children}
    </RuntimeSessionContext.Provider>
  );
}

export function useRuntimeSession() {
  const runtime = useContext(RuntimeSessionContext);
  if (!runtime) {
    throw new Error(
      "useRuntimeSession must be used inside RuntimeSessionProvider",
    );
  }
  return runtime;
}
