import {
  disableTerminateAfterDone,
  getRuntimeStats,
  getTerminateAfterDoneStatus,
  restartDevScript,
} from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type RuntimeSettingsConnection = {
  instanceId: string;
  runtimeUrl: string;
  localToken: string;
  accessToken: string;
};

const getQueryKey = (instanceId: string) => [
  "runtime",
  instanceId,
  "terminate-after-done",
];

export function useTerminateAfterDoneStatus(
  connection: RuntimeSettingsConnection,
) {
  return useQuery({
    queryKey: getQueryKey(connection.instanceId),
    queryFn: () => getTerminateAfterDoneStatus(connection),
    enabled: Boolean(
      connection.instanceId &&
      connection.runtimeUrl &&
      connection.localToken &&
      connection.accessToken,
    ),
    retry: false,
  });
}

export function useRuntimeStats(
  connection: RuntimeSettingsConnection,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["runtime", connection.instanceId, "stats"],
    queryFn: () => getRuntimeStats(connection),
    enabled:
      enabled &&
      Boolean(
        connection.instanceId &&
        connection.runtimeUrl &&
        connection.localToken &&
        connection.accessToken,
      ),
    retry: false,
    refetchInterval: 2_000,
  });
}

export function useDisableTerminateAfterDone(
  connection: RuntimeSettingsConnection,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => disableTerminateAfterDone(connection),
    onSuccess: (status) => {
      queryClient.setQueryData(getQueryKey(connection.instanceId), status);
    },
  });
}

export function useRestartDevScript(connection: RuntimeSettingsConnection) {
  return useMutation({
    mutationFn: () => restartDevScript(connection),
  });
}
