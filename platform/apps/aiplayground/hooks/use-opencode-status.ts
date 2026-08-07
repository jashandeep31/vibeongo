"use client";

import { getOpencodeStatus } from "@/services/opencode-services";
import { useQuery } from "@tanstack/react-query";

export function useOpencodeStatus(
  instanceId: string,
  runtimeUrl: string,
  token: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["opencode", "status", instanceId, runtimeUrl],
    queryFn: () => getOpencodeStatus(runtimeUrl, token),
    enabled: enabled && !!instanceId && !!runtimeUrl && !!token,
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.running === true ? false : 1_000,
  });
}
