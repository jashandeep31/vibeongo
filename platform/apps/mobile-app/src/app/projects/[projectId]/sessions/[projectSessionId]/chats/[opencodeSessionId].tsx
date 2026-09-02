import { Redirect, useLocalSearchParams } from "expo-router";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default function LegacyProjectChatRoute() {
  const params = useLocalSearchParams<{
    opencodeSessionId?: string | string[];
    projectId?: string | string[];
    projectSessionId?: string | string[];
  }>();

  return (
    <Redirect
      href={{
        pathname: "/projects/[projectId]/sessions/[projectSessionId]/chat",
        params: {
          chatId: firstParam(params.opencodeSessionId),
          projectId: firstParam(params.projectId),
          projectSessionId: firstParam(params.projectSessionId),
        },
      }}
    />
  );
}
