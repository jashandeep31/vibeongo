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

const accessPath = (instanceId: string) =>
  `/api/v1/instances/${encodeURIComponent(instanceId)}/ssh-access`;

export const createSshAccess =
  (apiClient: AxiosInstance) =>
  async (instanceId: string): Promise<CreateSshAccessResponse> => {
    const response = await apiClient.post<CreateSshAccessResponse>(
      accessPath(instanceId),
      undefined,
      { withCredentials: true },
    );
    return response.data;
  };

export const listSshAccess =
  (apiClient: AxiosInstance) =>
  async (instanceId: string): Promise<SshAccessSummary[]> => {
    const response = await apiClient.get<SshAccessSummary[]>(
      accessPath(instanceId),
      { withCredentials: true },
    );
    return response.data;
  };

export const revokeSshAccess =
  (apiClient: AxiosInstance) =>
  async ({
    instanceId,
    accessId,
  }: {
    instanceId: string;
    accessId: string;
  }): Promise<void> => {
    await apiClient.post(
      `${accessPath(instanceId)}/${encodeURIComponent(accessId)}/revoke`,
      undefined,
      { withCredentials: true },
    );
  };
