import { v4 as uuid } from "uuid";

export interface GitRepoConfig {
  id: string;
  git_url: string;
  access_token: string;
}

export interface PortRule {
  id: string;
  port: string;
  protocol: "TCP" | "UDP";
}

export function createGitRepoConfig(): GitRepoConfig {
  return {
    id: uuid(),
    git_url: "",
    access_token: "",
  };
}

export function createPortRule(
  port: string,
  protocol: PortRule["protocol"] = "TCP",
): PortRule {
  return {
    id: uuid(),
    port,
    protocol,
  };
}
