import type { SandboxProvider } from "./types.js";

// Let the application terminate instances before the provider's fallback expiry.
export const PROVIDER_TERMINATION_GRACE_MINUTES = 5;

// Add providers here when their suspension and resume flows are supported.
export const AUTOMATIC_SUSPENSION_PROVIDERS = new Set<SandboxProvider>(["e2b"]);
