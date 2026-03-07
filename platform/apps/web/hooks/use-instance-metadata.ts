import { getInstanceRegions } from "@/services/instance-metadata-service";
import { useQuery } from "@tanstack/react-query";

const useInstanceRegions = useQuery({
  queryKey: ["instance-regions"],
  queryFn: getInstanceRegions,
});
