import type { OpencodeError } from "./opencode-types.js";

const REDACTED_MESSAGE = "OpenCode could not complete this request.";

export function normalizeOpencodeError(value: unknown): OpencodeError {
  const record = asRecord(value);
  const legacyData = asRecord(record.data);
  const code = stringValue(record.type) ?? stringValue(record.name) ?? "UnknownError";
  const rawMessage =
    stringValue(record.message) ?? stringValue(legacyData.message) ?? REDACTED_MESSAGE;
  const statusCode =
    numberValue(record.status) ??
    numberValue(record.statusCode) ??
    numberValue(legacyData.status) ??
    numberValue(legacyData.statusCode);
  const providerID =
    stringValue(record.providerID) ?? stringValue(legacyData.providerID);
  const retryable =
    booleanValue(record.retryable) ?? booleanValue(legacyData.isRetryable);

  return {
    code,
    title: getOpencodeErrorTitle(code, statusCode, rawMessage),
    message: sanitizeOpencodeErrorMessage(rawMessage),
    ...(statusCode === undefined ? {} : { statusCode }),
    ...(providerID ? { providerID } : {}),
    ...(retryable === undefined ? {} : { retryable }),
  };
}

function getOpencodeErrorTitle(
  code: string,
  statusCode: number | undefined,
  message: string,
) {
  const value = `${code} ${message}`.toLowerCase();
  if (
    code === "ProviderAuthError" ||
    statusCode === 401 ||
    statusCode === 403 ||
    /api.?key|credential|unauthori[sz]ed|authentication/.test(value)
  ) {
    return "Provider authentication failed";
  }
  if (
    statusCode === 402 ||
    /credit|billing|payment|required|quota.*exceed|insufficient.*fund/.test(value)
  ) {
    return "Provider credits unavailable";
  }
  if (statusCode === 429 || /rate.?limit|too many requests/.test(value)) {
    return "Provider rate limit reached";
  }
  if (code === "ContextOverflowError" || /context.*(limit|length|window)/.test(value)) {
    return "Context limit exceeded";
  }
  if (code === "ContentFilterError" || /content.?filter|safety/.test(value)) {
    return "Response blocked";
  }
  if (code === "MessageOutputLengthError") return "Response was too long";
  if (code === "MessageAbortedError" || /abort|interrupt|cancel/.test(value)) {
    return "Request was stopped";
  }
  if (code === "StructuredOutputError") return "Invalid structured response";
  return "OpenCode request failed";
}

function sanitizeOpencodeErrorMessage(message: string) {
  if (!message.trim()) return REDACTED_MESSAGE;
  return message
    .replace(/(authorization\s*[:=]\s*)(bearer\s+)?[^\s,;]+/gi, "$1[redacted]")
    .replace(/((?:api[_ -]?key|token|secret|password)\s*[:=]\s*)[^\s,;]+/gi, "$1[redacted]");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}
