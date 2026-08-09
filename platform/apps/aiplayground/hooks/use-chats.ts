import { deleteChat, getChats } from "@/services/chat-services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const VIBEONGO_AGENT = "vibeongo-agent" as const;

export const useGetVibeongoChats = (limit = 5) =>
  useQuery({
    queryKey: ["chats", VIBEONGO_AGENT, { limit }],
    queryFn: () => getChats({ agentName: VIBEONGO_AGENT, limit }),
  });

export const useDeleteChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteChat,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chats"] }),
  });
};
