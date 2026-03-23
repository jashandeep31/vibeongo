import { BACKEND_URL } from "@/lib/constants";
import { sshKeys } from "@repo/db";
import axios from "axios";

export const createSshKey = async (data: unknown) => {
  const res = await axios.post(`${BACKEND_URL}/api/v1/users/ssh-keys`, data, {
    withCredentials: true,
  });
  return res.status;
};

export const getSshKeys = async (): Promise<
  (typeof sshKeys.$inferSelect)[]
> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/users/ssh-keys`, {
    withCredentials: true,
  });
  return res.data.data;
};

export const deleteSshKey = async (id: string) => {
  const res = await axios.delete(`${BACKEND_URL}/api/v1/users/ssh-keys/${id}`, {
    withCredentials: true,
  });
  return res.status;
};
