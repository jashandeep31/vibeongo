import { getOpencodePassword } from "@repo/api-client";
import { useGetInstances } from "@repo/api-hooks";

export function useProjectRuntime(projectSessionId: string) {
  const query = useGetInstances(
    { sessionId: projectSessionId, state: "running", limit: 1 },
    Boolean(projectSessionId),
  );
  const instance = query.data?.data[0];

  return {
    ...query,
    instance,
    serverUrl: instance
      ? `https://4096-${instance.id}${instance.proxy_domain}`
      : "",
    accessToken: instance?.access_token ?? "",
    password: getOpencodePassword(instance?.config),
  };
}
