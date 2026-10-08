export const PAUSEABLE_SANDBOX_PROVIDERS = ["e2b", "boat"] as const;

export const MAX_BOAT_EXTENSION_MINUTES = 120;

export const supportsInstanceTimeExtension = (
  instance:
    { runtime_kind: string; sandbox_type_id: string | null } | null | undefined,
  sandbox: { id: string; provider: string } | null | undefined,
): boolean =>
  instance?.runtime_kind === "vm" ||
  (instance?.runtime_kind === "sandbox" &&
    instance.sandbox_type_id === sandbox?.id &&
    sandbox?.provider === "boat");

export const supportsSandboxSuspension = (
  provider: string | null | undefined,
): boolean =>
  PAUSEABLE_SANDBOX_PROVIDERS.some((supported) => supported === provider);
