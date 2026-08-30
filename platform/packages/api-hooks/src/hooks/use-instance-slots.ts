import type { ApiClient } from "@repo/api-client";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "../api-client-context.js";

type GetInstanceSlotsFilters = NonNullable<
  Parameters<ApiClient["instanceSlots"]["getInstanceSlots"]>[0]
>;

export const useInstanceSlotUsage = (enabled = true) => {
  const client = useApiClient();

  return useQuery({
    queryKey: ["instance-slot-usage"],
    queryFn: client.instanceSlots.getInstanceSlotUsage,
    enabled,
  });
};

export const useInstanceSlots = (
  filters: GetInstanceSlotsFilters = {},
  enabled = true,
) => {
  const client = useApiClient();

  return useQuery({
    queryKey: ["instance-slots", filters],
    queryFn: () => client.instanceSlots.getInstanceSlots(filters),
    enabled,
  });
};
