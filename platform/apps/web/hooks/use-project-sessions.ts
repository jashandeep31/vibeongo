import { getProjectSessions } from "@/services/project-session-services";
import { useQuery } from "@tanstack/react-query";

export const useGetProjectSessions = () =>
  useQuery({
    queryKey: ["project-sessions"],
    queryFn: getProjectSessions,
  });
