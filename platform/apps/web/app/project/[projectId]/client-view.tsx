"use client";

import { useGetProjectById } from "@/hooks/use-project";

export default function ClientView({ projectId }: { projectId: string }) {
  const { data: project, isLoading, isError } = useGetProjectById(projectId);
  return <div>{JSON.stringify(project)}</div>;
}
