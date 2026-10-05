import { randomUUID } from "node:crypto";

export interface ChatgptRegistration {
  clientId: string;
  subject: string;
  email?: string;
}

export interface ChatgptHost {
  hostId: string;
  registrations: ChatgptRegistration[];
}

async function registrationEntry() {
  try {
    const { AsyncEntry } = await import("@napi-rs/keyring");
    return new AsyncEntry("com.vibeongo.cli.chatgpt", "registrations", {
      linux: { store: "secret-service" },
    });
  } catch {
    throw new Error(
      "The OS keyring is unavailable. Unlock it before signing in with ChatGPT.",
    );
  }
}

export async function saveChatgptHost(host: ChatgptHost) {
  try {
    await (await registrationEntry()).setPassword(JSON.stringify(host));
  } catch {
    throw new Error(
      "Could not save the ChatGPT host registration in the OS keyring.",
    );
  }
}

export async function loadChatgptHost(): Promise<ChatgptHost> {
  let saved: string | undefined;
  try {
    saved = await (await registrationEntry()).getPassword();
  } catch {
    throw new Error(
      "Could not read ChatGPT registrations. Check that your OS keyring is running and unlocked.",
    );
  }
  if (!saved) {
    const host = { hostId: `urn:uuid:${randomUUID()}`, registrations: [] };
    await saveChatgptHost(host);
    return host;
  }
  const host = JSON.parse(saved) as ChatgptHost;
  if (
    typeof host.hostId !== "string" ||
    !host.hostId.startsWith("urn:uuid:") ||
    !Array.isArray(host.registrations) ||
    !host.registrations.every(
      (entry) =>
        typeof entry.clientId === "string" &&
        entry.clientId !== "dynamic_agent_client" &&
        typeof entry.subject === "string" &&
        (entry.email === undefined || typeof entry.email === "string"),
    )
  ) {
    throw new Error("The saved ChatGPT registration is invalid.");
  }
  return host;
}
