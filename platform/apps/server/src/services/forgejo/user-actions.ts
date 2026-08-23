import axios from "axios";
import { env } from "../../lib/env.js";
import { users } from "@repo/db";
import crypto from "crypto";

export const forgejoAPIClient = axios.create({
  baseURL: env.FORGEJO_URL + "/api/v1",
  headers: {
    Authorization: `Bearer ${env.FORGEJO_TOKEN}`,
  },
});
export async function createForgejoUserAccount(
  user: typeof users.$inferSelect,
): Promise<{
  status: "ok" | "error";
  user: any;
}> {
  const res = await forgejoAPIClient.post("/admin/users", {
    created_at: new Date(),
    email: user.email,
    full_name: user.first_name ? user.first_name : user.username,
    login_name: user.username,
    must_change_password: false,
    password: crypto.randomBytes(10).toString("hex"),
    restricted: false,
    send_notify: false,
    source_id: 0,
    username: user.username,
    visibility: "private",
  });

  if (res.status === 201) {
    return {
      status: "ok",
      user: res.data,
    };
  } else {
    return {
      status: "error",
      user: null,
    };
  }
}

export async function getAllForgejoUsers(login_name?: string) {
  const res = await forgejoAPIClient.get("/admin/users", {
    params: {
      ...(login_name ? { login_name: login_name } : {}),
    },
  });
  return res.data;
}
