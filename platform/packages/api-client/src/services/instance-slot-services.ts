import {
  instanceRuntimeKind,
  instanceSlotInstanceCategory,
  instanceSlots,
  instanceSlotStatus,
} from "@repo/db";
import type { AxiosInstance } from "axios";

export type InstanceSlot = typeof instanceSlots.$inferSelect;

export type GetInstanceSlotsFilters = {
  page?: number;
  limit?: number;
  status?: (typeof instanceSlotStatus.enumValues)[number] | "all";
  category?: (typeof instanceSlotInstanceCategory.enumValues)[number] | "all";
  runtime?: (typeof instanceRuntimeKind.enumValues)[number] | "all";
  sessionId?: string;
};

export type GetInstanceSlotsResponse = {
  data: InstanceSlot[];
  page: number;
  hasNext: boolean;
};

export const getInstanceSlots =
  (apiClient: AxiosInstance) =>
  async ({
    page = 1,
    limit = 10,
    status = "all",
    category = "all",
    runtime = "all",
    sessionId,
  }: GetInstanceSlotsFilters = {}): Promise<GetInstanceSlotsResponse> => {
    const response = await apiClient.get("/api/v1/instance-slots", {
      params: {
        page,
        limit,
        status,
        category,
        runtime,
        session_id: sessionId,
      },
      withCredentials: true,
    });

    return response.data;
  };
