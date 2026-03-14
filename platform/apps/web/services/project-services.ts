import { BACKEND_URL } from "@/lib/constants";
import axios from "axios";

export const createProject = async (projectData: unknown) => {
  console.log(projectData);
  const res = await axios.post(
    BACKEND_URL + "/api/v1/project/",
    projectData,
    { withCredentials: true },
  );
  return res.data;
};
