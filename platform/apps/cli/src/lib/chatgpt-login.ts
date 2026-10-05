import { createHash, randomBytes } from "node:crypto";
import { stripVTControlCharacters } from "node:util";
import { createRemoteJWKSet, jwtVerify } from "jose";
import open from "open";
import { DEFAULT_SERVER_URL, getUserMetadata, normalizeServerUrl } from "./api.js";
import { getApiKey } from "./credential-store.js";
import { saveCodexCredentials } from "./provider-credentials.js";
import { loadChatgptHost, saveChatgptHost } from "./chatgpt-registration.js";
import { sendCallbackMessage, startOAuthCallback } from "./oauth-callback.js";

const ISSUER = "https://auth.openai.com";
const RESOURCE = "https://api.openai.com/v1";
const SCOPES =
  "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function loginWithChatgpt(options: {
  newAccount?: boolean;
  clientId?: string;
  serverUrl?: string;
}) {
  const serverUrl = normalizeServerUrl(options.serverUrl ?? DEFAULT_SERVER_URL);
  const apiKey = await getApiKey(serverUrl);
  if (!apiKey) {
    throw new Error(
      "Log in to Vibeongo first with vibeongo login. Use the same --server-url for both commands.",
    );
  }
  await getUserMetadata(serverUrl, apiKey);
  const host = await loadChatgptHost();
  if (options.newAccount && options.clientId) {
    throw new Error("Choose either --new-account or --client-id.");
  }
  const selected = options.newAccount
    ? undefined
    : options.clientId
      ? host.registrations.find((entry) => entry.clientId === options.clientId)
      : host.registrations.at(-1);
  if (options.clientId && !selected) {
    throw new Error(
      "That client ID is not registered on this host. Use --new-account to register an account.",
    );
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5 * 60_000);
  const cancel = () => controller.abort();
  process.once("SIGINT", cancel);
  process.once("SIGTERM", cancel);
  let listener: Awaited<ReturnType<typeof startOAuthCallback>> | undefined;
  try {
    const state = randomBytes(32).toString("base64url");
    const nonce = randomBytes(32).toString("base64url");
    const verifier = randomBytes(64).toString("base64url");
    listener = await startOAuthCallback(state, controller.signal);

    const discoveryResponse = await fetch(
      `${ISSUER}/.well-known/openid-configuration`,
      {
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(15_000),
        ]),
        redirect: "error",
      },
    );
    if (!discoveryResponse.ok)
      throw new Error(
        `OpenAI discovery failed (HTTP ${discoveryResponse.status}).`,
      );
    const discovery: unknown = await discoveryResponse.json();
    if (!isRecord(discovery) || discovery.issuer !== ISSUER) {
      throw new Error("OpenAI returned an unexpected issuer configuration.");
    }
    for (const field of [
      "authorization_endpoint",
      "token_endpoint",
      "jwks_uri",
    ]) {
      if (
        typeof discovery[field] !== "string" ||
        new URL(discovery[field]).origin !== ISSUER
      ) {
        throw new Error(`OpenAI returned an invalid ${field}.`);
      }
    }
    const authorizationUrl = new URL(
      discovery.authorization_endpoint as string,
    );
    authorizationUrl.search = new URLSearchParams({
      client_id: selected?.clientId ?? "dynamic_agent_client",
      ext_agent_host_id: host.hostId,
      response_type: "code",
      redirect_uri: listener.redirectUri,
      scope: SCOPES,
      resource: RESOURCE,
      state,
      nonce,
      code_challenge_method: "S256",
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      ...(!selected ? { agent_name_hint: "Vibeongo" } : {}),
      ...(selected?.email ? { login_hint: selected.email } : {}),
    }).toString();

    // Browser opening must not prevent the callback, cancellation, or timeout.
    void open(authorizationUrl.toString()).catch(() => {
      controller.abort();
    });
    const { params, response } = await listener.callback;

    try {
      if (params.has("error"))
        throw new Error(
          `OpenAI authorization failed: ${JSON.stringify(params.get("error"))}.`,
        );
      if (params.getAll("code").length !== 1 || !params.get("code")) {
        throw new Error("OpenAI did not return a single authorization code.");
      }
      if (params.getAll("client_id").length > 1)
        throw new Error("OpenAI returned multiple client IDs.");
      const clientId = params.get("client_id") ?? selected?.clientId;
      if (!clientId || clientId === "dynamic_agent_client") {
        throw new Error(
          "Registration is incomplete: OpenAI did not return an issued client ID.",
        );
      }
      if (selected && clientId !== selected.clientId) {
        throw new Error(
          "The callback client ID does not match the selected account.",
        );
      }
      const tokenResponse = await fetch(discovery.token_endpoint as string, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          code: params.get("code")!,
          code_verifier: verifier,
          redirect_uri: listener.redirectUri,
          resource: RESOURCE,
        }),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(30_000),
        ]),
        redirect: "error",
      });
      const rawBody = await tokenResponse.text();
      let tokens: unknown;
      try {
        tokens = JSON.parse(rawBody);
      } catch {
        tokens = rawBody;
      }
      if (!tokenResponse.ok) {
        throw new Error(
          `Token exchange failed (HTTP ${tokenResponse.status}). Start a fresh sign-in; do not reuse the code.`,
        );
      }
      if (!isRecord(tokens) || typeof tokens.id_token !== "string") {
        throw new Error("OpenAI did not return an ID token.");
      }
      const { payload } = await jwtVerify(
        tokens.id_token,
        createRemoteJWKSet(new URL(discovery.jwks_uri as string), {
          timeoutDuration: 15_000,
        }),
        {
          issuer: ISSUER,
          audience: clientId,
          requiredClaims: ["sub", "exp", "iat"],
          clockTolerance: 5,
        },
      );
      if (payload.nonce !== nonce || !payload.sub)
        throw new Error("ID token nonce or account identity is invalid.");
      if (selected && payload.sub !== selected.subject) {
        throw new Error(
          "The signed-in ChatGPT account does not match the selected registration.",
        );
      }
      controller.signal.throwIfAborted();
      const registration = {
        clientId,
        subject: payload.sub,
        ...(typeof payload.email === "string" ? { email: payload.email } : {}),
      };
      host.registrations = host.registrations.filter(
        (entry) => entry.clientId !== clientId,
      );
      host.registrations.push(registration);
      await saveChatgptHost(host);

      const scopes =
        typeof tokens.scope === "string" ? tokens.scope.split(/\s+/) : [];
      const missingScopes = [
        "chatgpt.tokens.use.direct",
        "resource.invoke",
        "offline_access",
      ].filter((scope) => !scopes.includes(scope));
      if (
        missingScopes.length ||
        typeof tokens.access_token !== "string" ||
        typeof tokens.refresh_token !== "string"
      ) {
        throw new Error(
          `ChatGPT plan usage was not fully authorized. Missing scopes: ${missingScopes.join(", ") || "none"}. Access and refresh tokens are required.`,
        );
      }
      await saveCodexCredentials(
        serverUrl,
        apiKey,
        { ...tokens, client_id: clientId },
        controller.signal,
      );
      const name = typeof payload.name === "string"
        ? stripVTControlCharacters(payload.name)
          .replace(/[\p{Cc}\p{Cf}]/gu, "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 120)
        : "";
      console.log(
        `ChatGPT sign-in successful${name ? ` (${name})` : ""}.`,
      );
      sendCallbackMessage(
        response,
        200,
        "ChatGPT sign-in completed and credentials saved to Vibeongo. You can close this tab.",
      );
    } catch (error) {
      sendCallbackMessage(
        response,
        400,
        "ChatGPT sign-in failed. You can close this tab.",
      );
      throw error;
    }
  } finally {
    clearTimeout(timeout);
    process.removeListener("SIGINT", cancel);
    process.removeListener("SIGTERM", cancel);
    listener?.close();
  }
}
