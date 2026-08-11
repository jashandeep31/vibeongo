import { ApiError, apiFetch, apiRequest } from "@/lib/api";

export type ThemePreference = "light" | "dark" | "system";
export type ConfigType = "opencode" | "codex" | "pi";

export type UserSettings = {
  default_comment_model: string | null;
  default_issue_fixer_model: string | null;
  default_issue_instance_auto_terminate_after_minutes: number;
  default_manual_instance_auto_terminate_after_minutes: number;
  default_model: string | null;
  default_pr_instance_auto_terminate_after_minutes: number;
  default_pr_model: string | null;
  telegram_chat_id: number | null;
};

export type UserConfigSummary = {
  config_type: ConfigType;
  id: string;
};

export type SshKey = {
  id: string;
  name: string;
  value: string;
};

export type UpdateSettingsPayload = {
  defaultCommentModel?: string | null;
  defaultIssueFixerModel?: string | null;
  defaultIssueInstanceAutoTerminateAfterMinutes?: number;
  defaultManualInstanceAutoTerminateAfterMinutes?: number;
  defaultModel?: string | null;
  defaultPrInstanceAutoTerminateAfterMinutes?: number;
  defaultPrModel?: string | null;
  telegramChatId?: number | null;
};

export const getSettings = (signal?: AbortSignal) =>
  apiRequest<UserSettings>("/api/v1/users/settings", {}, signal);

export const getConfigs = (signal?: AbortSignal) =>
  apiRequest<UserConfigSummary[]>("/api/v1/users/configs", {}, signal);

export const getSshKeys = (signal?: AbortSignal) =>
  apiRequest<SshKey[]>("/api/v1/users/ssh-keys", {}, signal);

export const updateSettings = (payload: UpdateSettingsPayload) =>
  apiRequest<UserSettings>("/api/v1/users/settings", {
    body: JSON.stringify(payload),
    method: "PUT",
  });

async function requestWithoutData(path: string, init: RequestInit) {
  const response = await apiFetch(path, init);
  if (response.ok) return;
  const body = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | null;
  throw new ApiError(
    body?.message ?? body?.error ?? `Request failed (${response.status})`,
    response.status,
  );
}

export const createSshKey = (payload: { name: string; value: string }) =>
  requestWithoutData("/api/v1/users/ssh-keys", {
    body: JSON.stringify(payload),
    method: "POST",
  });

export const deleteSshKey = (id: string) =>
  requestWithoutData(`/api/v1/users/ssh-keys/${id}`, { method: "DELETE" });
