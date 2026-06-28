import { BACKEND_URL } from "@/lib/constants";
import { chats } from "@repo/db";
import axios from "axios";

export type Chat = typeof chats.$inferSelect;

export type GetChatsResponse = {
  data: {
    chats: Chat[];
  };
};

export const getChats = async (): Promise<GetChatsResponse> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/chats`, {
    withCredentials: true,
  });

  return res.data;
};
