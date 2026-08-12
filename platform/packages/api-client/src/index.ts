import axios, { type AxiosInstance } from "axios";
import * as chatsApi from "./services/chat-services.js";
import * as githubReposApi from "./services/github-repo-services.js";
import * as instancesApi from "./services/instance-services.js";
import * as projectMetadataApi from "./services/project-metadata-services.js";
import * as projectsApi from "./services/project-services.js";
import * as projectSessionsApi from "./services/project-session-services.js";
import * as sshKeysApi from "./services/ssh-key-services.js";
import * as usersApi from "./services/user-services.js";
import * as walletApi from "./services/wallet-services.js";

export * from "./services/opencode-services.js";
export * from "./services/proxy-auth.js";
export * from "./services/runtime-settings-services.js";

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
  githubRepos: ReturnType<typeof bindApiModule<typeof githubReposApi>>;
  instances: ReturnType<typeof bindApiModule<typeof instancesApi>>;
  projectMetadata: ReturnType<typeof bindApiModule<typeof projectMetadataApi>>;
  projects: ReturnType<typeof bindApiModule<typeof projectsApi>>;
  projectSessions: ReturnType<typeof bindApiModule<typeof projectSessionsApi>>;
  sshKeys: ReturnType<typeof bindApiModule<typeof sshKeysApi>>;
  users: ReturnType<typeof bindApiModule<typeof usersApi>>;
  wallet: ReturnType<typeof bindApiModule<typeof walletApi>>;

  constructor(url: string, token: string) {
    this.apiClient = axios.create({
      baseURL: url,
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    this.chats = bindApiModule(chatsApi, this.apiClient);
    this.githubRepos = bindApiModule(githubReposApi, this.apiClient);
    this.instances = bindApiModule(instancesApi, this.apiClient);
    this.projectMetadata = bindApiModule(projectMetadataApi, this.apiClient);
    this.projects = bindApiModule(projectsApi, this.apiClient);
    this.projectSessions = bindApiModule(projectSessionsApi, this.apiClient);
    this.sshKeys = bindApiModule(sshKeysApi, this.apiClient);
    this.users = bindApiModule(usersApi, this.apiClient);
    this.wallet = bindApiModule(walletApi, this.apiClient);
  }
}

export class WebClient {
  apiClient: AxiosInstance;
  chats: ReturnType<typeof bindApiModule<typeof chatsApi>>;
  githubRepos: ReturnType<typeof bindApiModule<typeof githubReposApi>>;
  instances: ReturnType<typeof bindApiModule<typeof instancesApi>>;
  projectMetadata: ReturnType<typeof bindApiModule<typeof projectMetadataApi>>;
  projects: ReturnType<typeof bindApiModule<typeof projectsApi>>;
  projectSessions: ReturnType<typeof bindApiModule<typeof projectSessionsApi>>;
  sshKeys: ReturnType<typeof bindApiModule<typeof sshKeysApi>>;
  users: ReturnType<typeof bindApiModule<typeof usersApi>>;
  wallet: ReturnType<typeof bindApiModule<typeof walletApi>>;

  constructor(url: string) {
    this.apiClient = axios.create({
      baseURL: url,
      withCredentials: true,
    });

    this.chats = bindApiModule(chatsApi, this.apiClient);
    this.githubRepos = bindApiModule(githubReposApi, this.apiClient);
    this.instances = bindApiModule(instancesApi, this.apiClient);
    this.projectMetadata = bindApiModule(projectMetadataApi, this.apiClient);
    this.projects = bindApiModule(projectsApi, this.apiClient);
    this.projectSessions = bindApiModule(projectSessionsApi, this.apiClient);
    this.sshKeys = bindApiModule(sshKeysApi, this.apiClient);
    this.users = bindApiModule(usersApi, this.apiClient);
    this.wallet = bindApiModule(walletApi, this.apiClient);
  }
}

export type ApiClient = MobileClient | WebClient;
