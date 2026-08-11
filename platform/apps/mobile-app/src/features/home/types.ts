export type UserMetadata = {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  balance: number;
};

export type RecentChat = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type ProjectSession = {
  id: string;
  name: string;
  description?: string | null;
  project_id: string;
  archived: boolean;
  created_at: string;
  runtime?: ProjectSessionRuntime;
};

export type ProjectSessionRuntimeKind = "vm" | "sandbox";
export type ProjectSessionState = "running" | "processing" | "stopped";

export type RuntimeInstance = {
  id: string;
  project_id: string | null;
  project_session_id: string | null;
  runtime_kind: ProjectSessionRuntimeKind;
  state: "running" | "terminated";
  terminates_at: string;
  proxy_domain: string;
  access_token: string;
  config: unknown;
};

export type OpencodeChat = {
  id: string;
  title: string;
  directory?: string;
  time?: { created?: number; updated?: number };
};

export type ProjectSessionRuntime = {
  state: ProjectSessionState;
  instance: RuntimeInstance | null;
  chats: OpencodeChat[];
  error?: string;
};

export type ProjectGithubRepo = {
  id: string;
  full_name: string;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  sessions: ProjectSession[];
};

export type HomeData = {
  user: UserMetadata;
  chats: RecentChat[];
  projects: Project[];
};

export type ComposerTag = {
  type: "project";
  data: Pick<Project, "id" | "name">;
};
