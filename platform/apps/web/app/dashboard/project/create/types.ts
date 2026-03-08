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

function createItemId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

export function createGitRepoConfig(): GitRepoConfig {
  return {
    id: createItemId(),
    git_url: "",
    access_token: "",
  };
}

export function createPortRule(
  port: string,
  protocol: PortRule["protocol"] = "TCP",
): PortRule {
  return {
    id: createItemId(),
    port,
    protocol,
  };
}
