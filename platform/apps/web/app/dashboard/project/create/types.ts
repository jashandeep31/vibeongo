import { v4 as uuid } from "uuid";

export interface GitRepoConfig {
  id: string;
  git_url: string;
  access_token: string;
  folder_name: string;
  setup_script: string;
}

export interface PortRule {
  id: string;
  port: string;
  protocol: "TCP" | "UDP";
}

export function createGitRepoConfig(): GitRepoConfig {
  return {
    id: uuid(),
    git_url: "https://github.com/jashandeep31/mailstudio.git",
    access_token: "",
    folder_name: "mailstudio",
    setup_script: `#!/usr/bin/env bash`,
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
