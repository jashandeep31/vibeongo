import type { ApiClient } from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const VIBEONGO_AGENT = "vibeongo-agent" as const;

export const useGetVibeongoChats = (client: ApiClient, limit = 5) =>
  useQuery({
    queryKey: ["chats", VIBEONGO_AGENT, { limit }],
    queryFn: () => client.chats.getChats({ agentName: VIBEONGO_AGENT, limit }),
  });

export const useDeleteChat = (client: ApiClient) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.chats.deleteChat,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chats"] }),
  });
};
