import { BACKEND_URL } from "@/lib/constants";
import { chats } from "@repo/db";
import axios from "axios";

export type Chat = typeof chats.$inferSelect;

export type GetChatsResponse = {
  data: {
    chats: Chat[];
  };
};

export type RenameChatInput = {
  chatId: string;
  name: string;
};

export const getChats = async (): Promise<GetChatsResponse> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/chats`, {
    withCredentials: true,
  });

  return res.data;
};

export const renameChat = async ({ chatId, name }: RenameChatInput) => {
  const res = await axios.patch(
    `${BACKEND_URL}/api/v1/chats/${chatId}`,
    { name },
    {
      withCredentials: true,
    },
  );

  return res.data;
};

export const deleteChat = async (chatId: string) => {
  const res = await axios.delete(`${BACKEND_URL}/api/v1/chats/${chatId}`, {
    withCredentials: true,
  });

  return res.data;
};
