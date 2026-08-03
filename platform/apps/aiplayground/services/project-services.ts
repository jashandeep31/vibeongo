import { BACKEND_URL } from "@/lib/constants";
import axios from "axios";

export type Project = {
  id: string;
  name: string;
  description: string | null;
};

export const getProjects = async (): Promise<Project[]> => {
  const response = await axios.get(`${BACKEND_URL}/api/v1/projects`, {
    withCredentials: true,
  });

  return response.data.data;
};
