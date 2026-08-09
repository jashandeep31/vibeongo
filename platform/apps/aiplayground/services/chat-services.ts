import { BACKEND_URL } from "@/lib/constants";
import type { chats } from "@repo/db";
import axios from "axios";

export type Chat = typeof chats.$inferSelect;

type GetChatsParams = {
  agentName: Chat["chat_agent"];
  limit?: number;
};

type GetChatsResponse = {
  data: {
    chats: Chat[];
  };
};

export const getChats = async ({
  agentName,
  limit,
}: GetChatsParams): Promise<Chat[]> => {
  const response = await axios.get<GetChatsResponse>(
    `${BACKEND_URL}/api/v1/chats`,
    {
      params: { agentName, limit },
      withCredentials: true,
    },
  );

  return response.data.data.chats;
};
