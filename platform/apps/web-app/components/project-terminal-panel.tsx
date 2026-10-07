"use client";

import { memo } from "react";
import { ProjectTerminalWorkspace } from "@/components/project-terminal-workspace";

export const ProjectTerminalPanel = memo(function ProjectTerminalPanel(props: {
  projectId: string;
  projectSessionId: string;
  isActive: boolean;
  onClose: () => void;
}) {
  return <ProjectTerminalWorkspace {...props} mode="panel" />;
});
