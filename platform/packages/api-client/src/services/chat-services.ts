import type { chats } from "@repo/db";
import type { AxiosInstance } from "axios";

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

export const getChats =
  (apiClient: AxiosInstance) =>
  async ({ agentName, limit }: GetChatsParams): Promise<Chat[]> => {
    const response = await apiClient.get<GetChatsResponse>(`/api/v1/chats`, {
      params: { agentName, limit },
      withCredentials: true,
    });

    return response.data.data.chats;
  };

export const deleteChat =
  (apiClient: AxiosInstance) =>
  async (id: Chat["id"]): Promise<void> => {
    await apiClient.delete(`/api/v1/chats/${id}`, {
      withCredentials: true,
    });
  };
