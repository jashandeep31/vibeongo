import { getChats } from "@/services/chat-services";
import { useQuery } from "@tanstack/react-query";

export const useGetChats = (enabled = true) =>
  useQuery({
    queryKey: ["chats"],
    queryFn: getChats,
    enabled,
  });
