import { BACKEND_URL } from "../index.js";
import type { sshKeys } from "@repo/db";
import axios from "axios";

export const getSshKeys = async (): Promise<
  (typeof sshKeys.$inferSelect)[]
> => {
  const response = await axios.get(`${BACKEND_URL}/api/v1/users/ssh-keys`, {
    withCredentials: true,
  });
  return response.data.data;
};

export const createSshKey = async (
  input: Pick<typeof sshKeys.$inferInsert, "name" | "value">,
) => {
  await axios.post(`${BACKEND_URL}/api/v1/users/ssh-keys`, input, {
    withCredentials: true,
  });
};

export const updateSshKey = async (
  input: Pick<typeof sshKeys.$inferSelect, "id" | "value">,
) => {
  await axios.post(
    `${BACKEND_URL}/api/v1/users/ssh-keys/${input.id}`,
    { value: input.value },
    { withCredentials: true },
  );
};

export const deleteSshKey = async (id: string) => {
  await axios.delete(`${BACKEND_URL}/api/v1/users/ssh-keys/${id}`, {
    withCredentials: true,
  });
};
