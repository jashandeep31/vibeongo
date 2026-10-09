import { normalizeServerUrl } from "./api.js";

export type ProjectOverview = {
  id: string;
  name: string;
  sessions: {
    id: string;
    name: string;
    instances: {
      id: string;
      name: string;
      state: string;
      runtime_kind: string | null;
    }[];
  }[];
};

export type SshAccessSummary = {
  id: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
};

export type CreatedSshAccess = {
  id: string;
  username: string;
  host: string;
  port: number;
};

export class ApiHttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

export class CliApi {
  private readonly origin: string;

  constructor(
    serverUrl: string,
    private readonly apiKey: string,
  ) {
    this.origin = normalizeServerUrl(serverUrl);
  }

  private async request<T>(path: string, method = "GET"): Promise<T> {
    const response = await fetch(`${this.origin}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
      },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new ApiHttpError(response.status);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  getProjectOverview(page: number, limit: number) {
    return this.request<{ data: ProjectOverview[]; hasNext: boolean }>(
      `/api/v1/projects/overview?page=${page}&limit=${limit}`,
    );
  }

  createSshAccess(instanceId: string) {
    return this.request<CreatedSshAccess>(this.sshPath(instanceId), "POST");
  }

  listSshAccess(instanceId: string) {
    return this.request<SshAccessSummary[]>(this.sshPath(instanceId));
  }

  revokeSshAccess(instanceId: string, accessId: string) {
    return this.request<void>(
      `${this.sshPath(instanceId)}/${encodeURIComponent(accessId)}/revoke`,
      "POST",
    );
  }

  private sshPath(instanceId: string) {
    return `/api/v1/instances/${encodeURIComponent(instanceId)}/ssh-access`;
  }
}

export function formatSshCommand({ username, host, port }: CreatedSshAccess) {
  return `ssh${port === 22 ? "" : ` -p ${port}`} ${username}@${host}`;
}
