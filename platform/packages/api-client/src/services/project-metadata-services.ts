import {
  instanceRegions,
  instanceTypes,
  sandboxRegions,
  sandboxTypes,
} from "@repo/db";
import type { AxiosInstance } from "axios";

export const getInstanceRegions =
  (apiClient: AxiosInstance) =>
  async (): Promise<(typeof instanceRegions.$inferSelect)[]> => {
    const response = await apiClient.get(`/api/v1/metadata/instances/regions`);
    return response.data.data;
  };

export const getInstanceTypes =
  (apiClient: AxiosInstance) =>
  async (regionId: string): Promise<(typeof instanceTypes.$inferSelect)[]> => {
    const response = await apiClient.get(
      `/api/v1/metadata/instances/regions/${regionId}/types`,
    );
    return response.data.data;
  };

export const getSandboxRegions =
  (apiClient: AxiosInstance) =>
  async (): Promise<(typeof sandboxRegions.$inferSelect)[]> => {
    const response = await apiClient.get(`/api/v1/metadata/sandboxes/regions`);
    return response.data.data;
  };

export const getSandboxTypes =
  (apiClient: AxiosInstance) =>
  async (regionId: string): Promise<(typeof sandboxTypes.$inferSelect)[]> => {
    const response = await apiClient.get(
      `/api/v1/metadata/sandboxes/regions/${regionId}/types`,
    );
    return response.data.data;
  };
