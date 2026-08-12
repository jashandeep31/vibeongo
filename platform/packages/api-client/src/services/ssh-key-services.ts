import type { sshKeys } from "@repo/db";
import type { AxiosInstance } from "axios";

export const getSshKeys =
  (apiClient: AxiosInstance) =>
  async (): Promise<(typeof sshKeys.$inferSelect)[]> => {
    const response = await apiClient.get(`/api/v1/users/ssh-keys`, {
      withCredentials: true,
    });
    return response.data.data;
  };

export const createSshKey =
  (apiClient: AxiosInstance) =>
  async (input: Pick<typeof sshKeys.$inferInsert, "name" | "value">) => {
    await apiClient.post(`/api/v1/users/ssh-keys`, input, {
      withCredentials: true,
    });
  };

export const updateSshKey =
  (apiClient: AxiosInstance) =>
  async (input: Pick<typeof sshKeys.$inferSelect, "id" | "value">) => {
    await apiClient.post(
      `/api/v1/users/ssh-keys/${input.id}`,
      { value: input.value },
      { withCredentials: true },
    );
  };

export const deleteSshKey =
  (apiClient: AxiosInstance) => async (id: string) => {
    await apiClient.delete(`/api/v1/users/ssh-keys/${id}`, {
      withCredentials: true,
    });
  };
