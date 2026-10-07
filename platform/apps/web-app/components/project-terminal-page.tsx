"use client";

import { ProjectTerminalWorkspace } from "@/components/project-terminal-workspace";

export function ProjectTerminalPage(props: {
  projectId: string;
  projectSessionId: string;
}) {
  return <ProjectTerminalWorkspace {...props} />;
}
