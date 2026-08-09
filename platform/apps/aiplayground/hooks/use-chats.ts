import { getChats } from "@/services/chat-services";
import { useQuery } from "@tanstack/react-query";

const VIBEONGO_AGENT = "vibeongo-agent" as const;

export const useGetVibeongoChats = (limit = 5) =>
  useQuery({
    queryKey: ["chats", VIBEONGO_AGENT, { limit }],
    queryFn: () => getChats({ agentName: VIBEONGO_AGENT, limit }),
  });
