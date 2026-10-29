"use client";

import {
  controlOpencodeGoal,
  getOpencodeGoal,
  opencodeGoalRpc,
  type Event,
  type OpencodeGoal,
  type OpencodeGoalAction,
  type OpencodeGoalConnection,
} from "@repo/api-client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

export function opencodeGoalKey(
  chatId: string,
  serverUrl: string,
  sessionId?: string,
) {
  const prefix = ["opencode", "goal", chatId, serverUrl] as const;
  return sessionId ? [...prefix, sessionId] : prefix;
}

// Reuse each application's authenticated SSE stream, including expo/fetch on
// native. Cancel an older snapshot so it cannot overwrite a newer event.
export function applyOpencodeGoalEvent(
  queryClient: QueryClient,
  chatId: string,
  serverUrl: string,
  event: Event,
) {
  if (event.type !== "rpc.opencode.goal.changed") return;
  const parsed = opencodeGoalRpc.events.changed.schema.safeParse(
    event.properties,
  );
  if (!parsed.success) return;
  const { sessionID, goal } = parsed.data;
  const queryKey = opencodeGoalKey(chatId, serverUrl, sessionID);
  void queryClient.cancelQueries({ queryKey });
  queryClient.setQueriesData<OpencodeGoal | null>({ queryKey }, goal);
}

export function useOpencodeGoal(connection?: OpencodeGoalConnection) {
  const queryClient = useQueryClient();
  const queryKey = [
    ...opencodeGoalKey(
      connection?.chatId ?? "",
      connection?.serverUrl ?? "",
      connection?.sessionId,
    ),
    connection?.directory ?? "",
  ];
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => getOpencodeGoal(connection!, signal),
    enabled:
      !!connection?.sessionId &&
      !!connection.serverUrl &&
      !!connection.accessToken &&
      !!connection.directory,
    retry: false,
    staleTime: 0,
  });
  const mutation = useMutation({
    mutationKey: queryKey,
    mutationFn: ({
      target,
      action,
    }: {
      target: OpencodeGoalConnection;
      action: OpencodeGoalAction;
    }) => controlOpencodeGoal(target, action),
    onSuccess: async (_, { target }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: opencodeGoalKey(
            target.chatId,
            target.serverUrl,
            target.sessionId,
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "opencode",
            "session",
            target.chatId,
            target.sessionId,
            target.serverUrl,
          ],
        }),
      ]);
    },
  });
  // Mutation results from a previous chat must not appear in the new one.
  const target = mutation.variables?.target;
  const isCurrentMutation =
    !!connection &&
    !!target &&
    target.chatId === connection.chatId &&
    target.sessionId === connection.sessionId &&
    target.serverUrl === connection.serverUrl &&
    target.directory === connection.directory &&
    target.accessToken === connection.accessToken &&
    target.password === connection.password;

  return {
    goal: query.data,
    error: isCurrentMutation ? (mutation.error ?? query.error) : query.error,
    isPending: isCurrentMutation && mutation.isPending,
    isLoading: query.isFetching,
    refresh: () => {
      mutation.reset();
      void query.refetch();
    },
    control: (action: OpencodeGoalAction) => {
      if (connection && !mutation.isPending)
        mutation.mutate({ target: connection, action });
    },
  };
}
