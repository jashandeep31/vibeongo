import { BACKEND_URL } from "@/lib/constants";
import { githubRepos } from "@repo/db";
import axios from "axios";

export const createGithubRepo = async (data: { url: string }) => {
  const res = await axios.post(BACKEND_URL + "/api/v1/github-repos/", data, {
    withCredentials: true,
  });
  return res.data;
};

export const getGithubRepos = async (): Promise<
  (typeof githubRepos.$inferSelect)[]
> => {
  const res = await axios.get(BACKEND_URL + "/api/v1/github-repos/", {
    withCredentials: true,
  });
  return res.data.data;
};

export const deleteGithubRepo = async (id: string) => {
  const res = await axios.delete(BACKEND_URL + `/api/v1/github-repos/${id}`, {
    withCredentials: true,
  });
  return res.data;
};
