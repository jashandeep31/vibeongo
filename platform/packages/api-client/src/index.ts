import axios, { type AxiosInstance } from "axios";
import * as chatsApi from "./services/chat-services.js";
export const BACKEND_URL = "http://fedora:8000";

function bindApiModule<T extends Record<string, (api: AxiosInstance) => any>>(
  module: T,
  api: AxiosInstance,
) {
  return Object.fromEntries(
    Object.entries(module).map(([name, fn]) => [name, fn(api)]),
  ) as {
    [K in keyof T]: ReturnType<T[K]>;
  };
}

export class MobileClient {
  apiClient: AxiosInstance;
  chats: ReturnType<typeof bindApiModule<typeof chatsApi>>;

  constructor(url: string, token: string) {
    this.apiClient = axios.create({
      baseURL: url,
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    this.chats = bindApiModule(chatsApi, this.apiClient);
  }
}

export class WebClient {
  apiClient: AxiosInstance;
  chats: ReturnType<typeof bindApiModule<typeof chatsApi>>;
  constructor(url: string) {
    this.apiClient = axios.create({
      baseURL: url,
      withCredentials: true,
    });

    this.chats = bindApiModule(chatsApi, this.apiClient);
  }
}

const mobileClient = new MobileClient("", "");
mobileClient.chats.getChats({ agentName: "project-handler" });
// /009   chat-services.ts
// /010   github-repo-services.ts
// /001   instance-services.ts
// /011   opencode-services.ts
// /008   project-metadata-services.ts
// /002   project-services.ts
// /003   project-session-services.ts
// /004   proxy-auth.ts
// /012   runtime-settings-services.ts
// /005   ssh-key-services.ts
// /006   user-services.ts
// /007   wallet-services.ts
