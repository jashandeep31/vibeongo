import { BACKEND_URL } from "@/lib/constants";
import axios from "axios";

export const createProject = async (projectData: unknown) => {
  const res = await axios.post(
    BACKEND_URL + "/api/v1/project/",
    { projectData },
    { withCredentials: true },
  );
  console.log(projectData);
  return res.data;
};
