import {
  type ProjectConfigSubmissionError,
  useConfigStore,
} from "@/store/config-store";
import { projectConfigValidator, type z } from "@repo/shared";
import axios from "axios";
import { buildProjectConfigPayload } from "./project-config-payload";

type ConfigStoreState = ReturnType<typeof useConfigStore.getState>;
type ValidationIssue = z.core.$ZodIssue;

const authJsonFields = [
  {
    id: "opencode-auth-json",
    name: "Opencode",
    getValue: (state: ConfigStoreState) =>
      state.additionalServices.opencodeConfig.authJson,
  },
  {
    id: "codex-auth-json",
    name: "Codex",
    getValue: (state: ConfigStoreState) =>
      state.additionalServices.codexConfig.authJson,
  },
  {
    id: "pi-auth-json",
    name: "Pi",
    getValue: (state: ConfigStoreState) =>
      state.additionalServices.piConfig.authJson,
  },
] as const;

const isValidJson = (value: string) => {
  if (!value.trim()) return true;

  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};

const formatValidationIssue = (
  issue: ValidationIssue,
  index: number,
): ProjectConfigSubmissionError => {
  const path = issue.path.map(String);
  const portIndex =
    path[0] === "config" && path[1] === "ports" ? path[2] : null;
  const isPortIssue = portIndex !== null && path[3] === "port";
  const message = isPortIssue
    ? `Port rule ${Number(portIndex) + 1}: ${
        issue.code === "invalid_type"
          ? "Enter a whole number between 1 and 65535"
          : issue.message
      }`
    : issue.message;

  return {
    id: `validation-${path.join("-") || "form"}-${index}`,
    message,
    source: "validation",
  };
};

const deduplicateErrors = (errors: ProjectConfigSubmissionError[]) => {
  const seenMessages = new Set<string>();

  return errors.filter((error) => {
    if (seenMessages.has(error.message)) return false;
    seenMessages.add(error.message);
    return true;
  });
};

export const validateProjectConfig = (
  state: ConfigStoreState,
): ProjectConfigSubmissionError[] => {
  const invalidAuthFields = authJsonFields.filter(
    (field) => !isValidJson(field.getValue(state)),
  );
  const authErrors: ProjectConfigSubmissionError[] = invalidAuthFields.map(
    (field) => ({
      id: field.id,
      message: `${field.name} auth JSON is invalid`,
      source: "validation",
    }),
  );
  const invalidAuthIds = new Set(invalidAuthFields.map((field) => field.id));

  // Substitute invalid JSON only for schema validation so every other field can
  // be checked in the same submit attempt. The original state is never changed.
  const validationState: ConfigStoreState = {
    ...state,
    additionalServices: {
      ...state.additionalServices,
      opencodeConfig: {
        ...state.additionalServices.opencodeConfig,
        authJson: invalidAuthIds.has("opencode-auth-json")
          ? ""
          : state.additionalServices.opencodeConfig.authJson,
      },
      codexConfig: {
        ...state.additionalServices.codexConfig,
        authJson: invalidAuthIds.has("codex-auth-json")
          ? ""
          : state.additionalServices.codexConfig.authJson,
      },
      piConfig: {
        ...state.additionalServices.piConfig,
        authJson: invalidAuthIds.has("pi-auth-json")
          ? ""
          : state.additionalServices.piConfig.authJson,
      },
    },
  };
  const result = projectConfigValidator.safeParse(
    buildProjectConfigPayload(validationState),
  );
  const schemaErrors = result.success
    ? []
    : result.error.issues.map(formatValidationIssue);

  return deduplicateErrors([...authErrors, ...schemaErrors]);
};

export const getProjectSubmissionError = (
  error: unknown,
  fallbackMessage: string,
): ProjectConfigSubmissionError => {
  const isAxiosError = axios.isAxiosError<{ message?: unknown }>(error);
  const responseMessage = isAxiosError
    ? error.response?.data?.message
    : undefined;
  const message = isAxiosError
    ? typeof responseMessage === "string" && responseMessage.trim()
      ? responseMessage
      : fallbackMessage
    : error instanceof Error && error.message.trim()
      ? error.message
      : fallbackMessage;

  return {
    id: "server-submission-error",
    message,
    source: "server",
  };
};
