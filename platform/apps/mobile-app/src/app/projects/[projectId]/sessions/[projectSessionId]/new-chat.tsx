import { Redirect, useLocalSearchParams } from "expo-router";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default function LegacyNewProjectChatRoute() {
  const params = useLocalSearchParams<{
    agent?: string | string[];
    directory?: string | string[];
    model?: string | string[];
    projectId?: string | string[];
    projectSessionId?: string | string[];
    returnOpencodeSessionId?: string | string[];
    returnProjectId?: string | string[];
    returnProjectSessionId?: string | string[];
    variant?: string | string[];
  }>();

  return (
    <Redirect
      href={{
        pathname: "/projects/[projectId]/sessions/[projectSessionId]/chat",
        params: {
          chatId: "new",
          projectId: firstParam(params.projectId),
          projectSessionId: firstParam(params.projectSessionId),
          ...(firstParam(params.agent)
            ? { agent: firstParam(params.agent) }
            : {}),
          ...(firstParam(params.directory)
            ? { directory: firstParam(params.directory) }
            : {}),
          ...(firstParam(params.model)
            ? { model: firstParam(params.model) }
            : {}),
          ...(firstParam(params.variant)
            ? { variant: firstParam(params.variant) }
            : {}),
          ...(firstParam(params.returnOpencodeSessionId)
            ? {
                returnOpencodeSessionId: firstParam(
                  params.returnOpencodeSessionId,
                ),
              }
            : {}),
          ...(firstParam(params.returnProjectId)
            ? { returnProjectId: firstParam(params.returnProjectId) }
            : {}),
          ...(firstParam(params.returnProjectSessionId)
            ? {
                returnProjectSessionId: firstParam(
                  params.returnProjectSessionId,
                ),
              }
            : {}),
        },
      }}
    />
  );
}
