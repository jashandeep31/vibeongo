"use client";

import { useGetGithubRepoById } from "@/hooks/use-github-repos";

const ClientView = ({ id }: { id: string }) => {
  const { data: repo } = useGetGithubRepoById(id, "issues");
  return <div>{JSON.stringify(repo)}</div>;
};

export default ClientView;
