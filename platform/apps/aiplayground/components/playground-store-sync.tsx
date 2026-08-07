"use client";

import { useGetInstances } from "@/hooks/use-instance";
import { useOpencodeStatus } from "@/hooks/use-opencode-status";
import { useOpencodeSessions } from "@/hooks/use-opencode-sessions";
import { useGetProjectsWithSessions } from "@/hooks/use-project";
import { useProjectsStore, useSessionsStore } from "@/store/playground-store";
import { useEffect } from "react";

function ProjectSessionRuntimeSync({ sessionId }: { sessionId: string }) {
  const updateSession = useSessionsStore((store) => store.updateSession);
  const { data: instancesData, isPending, isError } = useGetInstances({
    sessionId,
    state: "running",
    limit: 1,
  });
  const instance = instancesData?.data[0];
  const instanceConfig =
    instance?.config &&
    typeof instance.config === "object" &&
    !Array.isArray(instance.config)
      ? instance.config
      : undefined;
  const localToken =
    instanceConfig && "vibeongoLocalToken" in instanceConfig
      ? instanceConfig.vibeongoLocalToken
      : undefined;
  const runtimeUrl = instance
    ? `https://3101-${instance.id}${instance.proxy_domain}`
    : "";
  const serverUrl = instance
    ? `https://4096-${instance.id}${instance.proxy_domain}`
    : "";
  const accessToken = instance?.access_token ?? "";
  const { data: opencodeStatus } = useOpencodeStatus(
    instance?.id ?? "",
    runtimeUrl,
    typeof localToken === "string" ? localToken : "",
    accessToken,
    !!instance,
  );
  const isOpencodeRunning = opencodeStatus?.running === true;

  useOpencodeSessions(
    sessionId,
    isOpencodeRunning ? serverUrl : "",
    accessToken,
    isOpencodeRunning,
  );

  useEffect(() => {
    if (isPending) {
      updateSession(sessionId, { instanceSyncState: "pending" });
      return;
    }

    if (!instance) {
      updateSession(sessionId, {
        instance: null,
        state: "stopped",
        instanceSyncState: isError ? "error" : "success",
      });
      return;
    }

    updateSession(sessionId, {
      instance,
      state: isOpencodeRunning ? "running" : "processing",
      instanceSyncState: "success",
    });
  }, [
    instance,
    isError,
    isOpencodeRunning,
    isPending,
    sessionId,
    updateSession,
  ]);

  return null;
}

export function PlaygroundStoreSync() {
  const { data: projectsWithSessions } = useGetProjectsWithSessions();
  const sessions = useSessionsStore((store) => store.sessions);
  const addAllProjects = useProjectsStore((store) => store.addAllProjects);
  const addAllSessions = useSessionsStore((store) => store.addAllSessions);

  useEffect(() => {
    if (!projectsWithSessions) return;

    const projects = projectsWithSessions.map((projectWithSessions) => {
      const project = { ...projectWithSessions };
      delete (project as Partial<typeof project>).sessions;
      return project;
    });

    addAllProjects(projects);

    const existingSessions = new Map(
      useSessionsStore
        .getState()
        .sessions.map((entry) => [entry.session.id, entry]),
    );

    addAllSessions(
      projectsWithSessions.flatMap((project) =>
        project.sessions.map((session) => {
          const existing = existingSessions.get(session.id);
          return existing
            ? { ...existing, session }
            : {
                session,
                instance: null,
                state: "stopped" as const,
                instanceSyncState: "pending" as const,
              };
        }),
      ),
    );
  }, [addAllProjects, addAllSessions, projectsWithSessions]);

  return sessions.map(({ session }) => (
    <ProjectSessionRuntimeSync key={session.id} sessionId={session.id} />
  ));
}
