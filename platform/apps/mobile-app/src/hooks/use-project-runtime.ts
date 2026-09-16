import { getOpencodePassword } from "@repo/api-client";
import { useGetInstances } from "@repo/api-hooks";
import { useSessionsStore } from "@repo/app-store";

function getConfigValue(config: unknown, key: string) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return "";
  const value = (config as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export function useProjectRuntime(projectSessionId: string) {
  const storedInstance = useSessionsStore(
    (store) =>
      store.sessions.find((entry) => entry.session.id === projectSessionId)
        ?.instance,
  );
  const query = useGetInstances(
    { sessionId: projectSessionId, state: "running", limit: 1 },
    Boolean(projectSessionId),
  );
  const instance = query.data ? query.data.data[0] : storedInstance;

  return {
    ...query,
    instance,
    serverUrl: instance
      ? `https://4096-${instance.id}${instance.proxy_domain}`
      : "",
    runtimeUrl: instance
      ? `https://3101-${instance.id}${instance.proxy_domain}`
      : "",
    accessToken: instance?.access_token ?? "",
    localToken: getConfigValue(instance?.config, "vibeongoLocalToken"),
    password: getOpencodePassword(instance?.config),
  };
}
