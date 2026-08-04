"use client";

import { useGetProjectsWithSessions } from "@/hooks/use-project";
import { useProjectsStore, useSessionsStore } from "@/store/playground-store";
import { useEffect } from "react";

export function PlaygroundStoreSync() {
  const { data: projectsWithSessions } = useGetProjectsWithSessions();
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

    addAllSessions(
      projectsWithSessions.flatMap((project) =>
        project.sessions.map((session) => ({
          session,
          instance: null,
          state: "stopped",
        })),
      ),
    );
  }, [addAllProjects, addAllSessions, projectsWithSessions]);

  return null;
}
