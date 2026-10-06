export const PAUSEABLE_SANDBOX_PROVIDERS = ["e2b", "boat"] as const;

export const supportsSandboxSuspension = (
  provider: string | null | undefined,
): boolean =>
  PAUSEABLE_SANDBOX_PROVIDERS.some((supported) => supported === provider);
