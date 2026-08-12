import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../api-client-context.js";

const VIBEONGO_AGENT = "vibeongo-agent" as const;

export const useGetVibeongoChats = (limit = 5) => {
  const client = useApiClient();
  return useQuery({
    queryKey: ["chats", VIBEONGO_AGENT, { limit }],
    queryFn: () => client.chats.getChats({ agentName: VIBEONGO_AGENT, limit }),
  });
};

export const useDeleteChat = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: client.chats.deleteChat,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chats"] }),
  });
};
