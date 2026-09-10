import axios from "axios";
import { env } from "../../lib/env.js";
import { users } from "@repo/db";
import crypto from "crypto";
import { FORGEJO_ACCOUNT_REQUIRED_MESSAGE } from "../../utils/defined-error-message.js";
import { AppError } from "../../lib/app-error.js";

export const forgejoAPIClient = axios.create({
  baseURL: env.FORGEJO_URL + "/api/v1",
  headers: {
    Authorization: `Bearer ${env.FORGEJO_TOKEN}`,
  },
});

export interface ForgejoUser {
  id: number;
  login: string;
  login_name: string;
  source_id: number;
  full_name: string;
  email: string;
  avatar_url: string;
  html_url: string;
  language: string;
  is_admin: boolean;
  last_login: string;
  created: string;
  restricted: boolean;
  active: boolean;
  prohibit_login: boolean;
  location: string;
  pronouns: string;
  website: string;
  description: string;
  visibility: string;
  followers_count: number;
  following_count: number;
  starred_repos_count: number;
  username: string;
}

export async function createForgejoUserAccount(
  user: typeof users.$inferSelect,
): Promise<
  { status: "ok"; user: ForgejoUser } | { status: "error"; user: null }
> {
  const res = await forgejoAPIClient.post<ForgejoUser>("/admin/users", {
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
    visibility: "public",
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

export async function getForgejoUser(
  username: string,
): Promise<ForgejoUser | null> {
  try {
    const res = await forgejoAPIClient.get<ForgejoUser>(
      `/users/${encodeURIComponent(username)}`,
    );
    return res.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function ensureForgejoUserAccount(
  user: typeof users.$inferSelect,
): Promise<ForgejoUser> {
  if (!user.forgejo_username) {
    throw new AppError(FORGEJO_ACCOUNT_REQUIRED_MESSAGE, 409);
  }
  const existingUser = await getForgejoUser(user.forgejo_username);
  if (existingUser) return existingUser;

  try {
    const result = await createForgejoUserAccount(user);
    if (result.status === "ok") return result.user;
  } catch (error: unknown) {
    // A retry or concurrent job may have created the account after our check.
    const concurrentlyCreatedUser = await getForgejoUser(
      user.forgejo_username,
    );
    if (concurrentlyCreatedUser) return concurrentlyCreatedUser;
    throw error;
  }

  throw new Error(`Failed to create Forgejo user ${user.username}`);
}

export async function getAllForgejoUsers(login_name?: string) {
  const res = await forgejoAPIClient.get("/admin/users", {
    params: {
      ...(login_name ? { login_name: login_name } : {}),
    },
  });
  return res.data;
}
