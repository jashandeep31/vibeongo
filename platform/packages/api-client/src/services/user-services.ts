import {
  userConfigs,
  userCreditGrants,
  users,
  userSettings,
  userWallet,
} from "@repo/db";
import type { AxiosInstance } from "axios";

type UserRow = typeof users.$inferSelect;

export type PasswordAuthUser = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string | null;
  primaryLoginMethod: "email_password" | "github";
  emailVerified: boolean;
};

export type SigninWithPasswordPayload = { email: string; password: string };
export type SignupWithPasswordPayload = SigninWithPasswordPayload & {
  firstName: string;
};

export type EmailOtpChallenge = {
  challengeId: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
};
export type SignupVerificationResponse = EmailOtpChallenge & {
  verificationRequired: true;
};
export type VerifyEmailPayload = {
  email: string;
  challengeId: string;
  otp: string;
};
export type ResetPasswordPayload = VerifyEmailPayload & { newPassword: string };
export type EmailVerificationResponse = {
  emailVerified: true;
  message: string;
};
export type ForgotPasswordResponse = EmailOtpChallenge & { message: string };
export type ResetPasswordResponse = { message: string };

export const verifyEmail =
  (apiClient: AxiosInstance) =>
  async (payload: VerifyEmailPayload): Promise<EmailVerificationResponse> => {
    const response = await apiClient.post<{ data: EmailVerificationResponse }>(
      "/api/v1/users/verify-email",
      payload,
      {
        withCredentials: apiClient.defaults.withCredentials === true,
        headers: { Authorization: null },
      },
    );
    return response.data.data;
  };
export const resendVerification =
  (apiClient: AxiosInstance) =>
  async (
    payload: Pick<VerifyEmailPayload, "email" | "challengeId">,
  ): Promise<EmailOtpChallenge> => {
    const response = await apiClient.post<{ data: EmailOtpChallenge }>(
      "/api/v1/users/resend-verification",
      payload,
      {
        withCredentials: apiClient.defaults.withCredentials === true,
        headers: { Authorization: null },
      },
    );
    return response.data.data;
  };
export const forgotPassword =
  (apiClient: AxiosInstance) =>
  async (payload: { email: string }): Promise<ForgotPasswordResponse> => {
    const response = await apiClient.post<{ data: ForgotPasswordResponse }>(
      "/api/v1/users/forgot-password",
      payload,
      {
        withCredentials: apiClient.defaults.withCredentials === true,
        headers: { Authorization: null },
      },
    );
    return response.data.data;
  };
export const resetPassword =
  (apiClient: AxiosInstance) =>
  async (payload: ResetPasswordPayload): Promise<ResetPasswordResponse> => {
    const response = await apiClient.post<{ data: ResetPasswordResponse }>(
      "/api/v1/users/reset-password",
      payload,
      {
        withCredentials: apiClient.defaults.withCredentials === true,
        headers: { Authorization: null },
      },
    );
    return response.data.data;
  };

export const signupWithPassword =
  (apiClient: AxiosInstance) =>
  async (
    payload: SignupWithPasswordPayload,
  ): Promise<SignupVerificationResponse> => {
    const response = await apiClient.post<{ data: SignupVerificationResponse }>(
      "/api/v1/users/signup",
      payload,
      { withCredentials: true },
    );
    return response.data.data;
  };

export const signinWithPassword =
  (apiClient: AxiosInstance) =>
  async (payload: SigninWithPasswordPayload): Promise<PasswordAuthUser> => {
    const response = await apiClient.post<{ data: PasswordAuthUser }>(
      "/api/v1/users/signin",
      payload,
      { withCredentials: true },
    );
    return response.data.data;
  };

export const getCurrentUser =
  (apiClient: AxiosInstance) => async (): Promise<PasswordAuthUser> => {
    const response = await apiClient.get<{ data: PasswordAuthUser }>(
      "/api/v1/users/me",
      { withCredentials: true },
    );
    return response.data.data;
  };

export type UserMetadata = Pick<UserRow, "id" | "username" | "tier"> & {
  balance: (typeof userWallet.$inferSelect)["balance"];
  forgejo_username: string | null;
  forgejo_profile_link: string | null;
  firstName: UserRow["first_name"];
  lastName: UserRow["last_name"];
};

type UserConfigSummary = Omit<
  typeof userConfigs.$inferSelect,
  "iv" | "encrypted_config" | "tag"
>;
// OpenCode stores the `opencode auth export` array, the other tools an object
export type UserConfigValue = Record<string, unknown> | unknown[];

type UserConfigPayload = {
  configType: (typeof userConfigs.$inferSelect)["config_type"];
  config: UserConfigValue;
};

export type GetUserCreditGrantsParams = {
  page?: number;
  limit?: number;
};

export type UpdateUserSettingsPayload = {
  defaultPrModel?: (typeof userSettings.$inferSelect)["default_pr_model"];
  defaultIssueFixerModel?: (typeof userSettings.$inferSelect)["default_issue_fixer_model"];
  defaultCommentModel?: (typeof userSettings.$inferSelect)["default_comment_model"];
  defaultModel?: (typeof userSettings.$inferSelect)["default_model"];
  telegramChatId?: (typeof userSettings.$inferSelect)["telegram_chat_id"];
  defaultIssueInstanceAutoTerminateAfterMinutes?: (typeof userSettings.$inferSelect)["default_issue_instance_auto_terminate_after_minutes"];
  defaultPrInstanceAutoTerminateAfterMinutes?: (typeof userSettings.$inferSelect)["default_pr_instance_auto_terminate_after_minutes"];
  defaultManualInstanceAutoTerminateAfterMinutes?: (typeof userSettings.$inferSelect)["default_manual_instance_auto_terminate_after_minutes"];
};

export type SetForgejoPasswordPayload = {
  password: string;
};

export type SetForgejoPasswordResponse = {
  message: string;
};

export const getUserMetadata =
  (apiClient: AxiosInstance) => async (): Promise<UserMetadata> => {
    const response = await apiClient.get(`/api/v1/users/metadata`, {
      withCredentials: true,
    });

    return response.data.data;
  };

export const getUserSettings =
  (apiClient: AxiosInstance) =>
  async (): Promise<typeof userSettings.$inferSelect | null> => {
    const response = await apiClient.get(`/api/v1/users/settings`, {
      withCredentials: true,
    });
    return response.data.data;
  };

export const updateUserSettings =
  (apiClient: AxiosInstance) =>
  async (
    payload: UpdateUserSettingsPayload,
  ): Promise<typeof userSettings.$inferSelect> => {
    const response = await apiClient.put(`/api/v1/users/settings`, payload, {
      withCredentials: true,
    });
    return response.data.data;
  };

export const setForgejoPassword =
  (apiClient: AxiosInstance) =>
  async (
    payload: SetForgejoPasswordPayload,
  ): Promise<SetForgejoPasswordResponse> => {
    const response = await apiClient.put(
      `/api/v1/users/forgejo/password`,
      payload,
      { withCredentials: true },
    );
    return response.data;
  };

export const getUserConfigs =
  (apiClient: AxiosInstance) => async (): Promise<UserConfigSummary[]> => {
    const response = await apiClient.get(`/api/v1/users/configs`, {
      withCredentials: true,
    });
    return response.data.data;
  };

export const getUserConfig =
  (apiClient: AxiosInstance) =>
  async (
    configType: (typeof userConfigs.$inferSelect)["config_type"],
  ): Promise<(UserConfigSummary & { config: UserConfigValue }) | null> => {
    const response = await apiClient.get(
      `/api/v1/users/configs/${configType}`,
      { withCredentials: true },
    );
    return response.data.data;
  };

export const createUserConfig =
  (apiClient: AxiosInstance) =>
  async (payload: UserConfigPayload): Promise<UserConfigSummary> => {
    const response = await apiClient.post(`/api/v1/users/configs`, payload, {
      withCredentials: true,
    });
    return response.data.data;
  };

export const updateUserConfig =
  (apiClient: AxiosInstance) =>
  async ({
    configType,
    config,
  }: UserConfigPayload): Promise<UserConfigSummary> => {
    const response = await apiClient.put(
      `/api/v1/users/configs/${configType}`,
      { config },
      { withCredentials: true },
    );
    return response.data.data;
  };

export const getUserCreditGrants =
  (apiClient: AxiosInstance) =>
  async ({ page, limit }: GetUserCreditGrantsParams = {}): Promise<{
    grants: (typeof userCreditGrants.$inferSelect)[];
    page: number;
    hasNext: boolean;
  }> => {
    const response = await apiClient.get(`/api/v1/users/credit-grants`, {
      params: { page, limit },
      withCredentials: true,
    });
    return response.data.data;
  };

export type MobilePasswordAuthResponse = {
  token: string;
  data: PasswordAuthUser;
};

export const mobileSignupWithPassword =
  (apiClient: AxiosInstance) =>
  async (
    payload: SignupWithPasswordPayload,
  ): Promise<SignupVerificationResponse> => {
    const response = await apiClient.post<{ data: SignupVerificationResponse }>(
      "/api/v1/users/mobile/signup",
      payload,
      { withCredentials: false, headers: { Authorization: null } },
    );
    return response.data.data;
  };

export const mobileSigninWithPassword =
  (apiClient: AxiosInstance) =>
  async (
    payload: SigninWithPasswordPayload,
  ): Promise<MobilePasswordAuthResponse> => {
    const response = await apiClient.post<MobilePasswordAuthResponse>(
      "/api/v1/users/mobile/signin",
      payload,
      { withCredentials: false, headers: { Authorization: null } },
    );
    return response.data;
  };

export type GithubConnectionStatus = {
  connected: boolean;
  username: string | null;
};
export type StartGithubConnectionPayload =
  | { clientType: "web" }
  | { clientType: "mobile"; state: string; codeChallenge: string };
export const getGithubConnection =
  (api: AxiosInstance) => async (): Promise<GithubConnectionStatus> => {
    const response = await api.get<{ data: GithubConnectionStatus }>(
      "/api/v1/users/github-connection",
      { withCredentials: true },
    );
    return response.data.data;
  };
export const startGithubConnection =
  (api: AxiosInstance) =>
  async (payload: StartGithubConnectionPayload): Promise<{ url: string }> => {
    const response = await api.post<{ data: { url: string } }>(
      "/api/v1/users/github-connection",
      payload,
      { withCredentials: payload.clientType === "web" },
    );
    return response.data.data;
  };
export const completeMobileGithubConnection =
  (api: AxiosInstance) =>
  async (payload: {
    ticket: string;
    state: string;
    codeVerifier: string;
  }): Promise<PasswordAuthUser> => {
    const response = await api.post<{ data: PasswordAuthUser }>(
      "/api/v1/users/github-connection/mobile/complete",
      payload,
      { withCredentials: false },
    );
    return response.data.data;
  };
