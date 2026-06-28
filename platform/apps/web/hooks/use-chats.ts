import {
  deleteChat,
  getChats,
  renameChat,
} from "@/services/chat-services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useGetChats = (enabled = true) =>
  useQuery({
    queryKey: ["chats"],
    queryFn: getChats,
    enabled,
  });

export const useRenameChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: renameChat,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
};

export const useDeleteChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteChat,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
};
