import type { AxiosInstance } from "axios";

export type SshAccessStatus =
  "active" | "expired" | "revoked" | "instance_unavailable";

export type SshAccessSummary = {
  id: string;
  instanceId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  status: SshAccessStatus;
};

export type CreateSshAccessResponse = {
  id: string;
  username: string;
  host: string;
  port: number;
  createdAt: string;
  expiresAt: string;
};

const accessPath = (projectSessionId: string) =>
  `/api/v1/project-sessions/${encodeURIComponent(projectSessionId)}/ssh-access`;

export const createSshAccess =
  (apiClient: AxiosInstance) =>
  async (projectSessionId: string): Promise<CreateSshAccessResponse> => {
    const response = await apiClient.post<CreateSshAccessResponse>(
      accessPath(projectSessionId),
      undefined,
      { withCredentials: true },
    );
    return response.data;
  };

export const listSshAccess =
  (apiClient: AxiosInstance) =>
  async (projectSessionId: string): Promise<SshAccessSummary[]> => {
    const response = await apiClient.get<SshAccessSummary[]>(
      accessPath(projectSessionId),
      { withCredentials: true },
    );
    return response.data;
  };

export const revokeSshAccess =
  (apiClient: AxiosInstance) =>
  async ({
    projectSessionId,
    accessId,
  }: {
    projectSessionId: string;
    accessId: string;
  }): Promise<void> => {
    await apiClient.post(
      `${accessPath(projectSessionId)}/${encodeURIComponent(accessId)}/revoke`,
      undefined,
      { withCredentials: true },
    );
  };
