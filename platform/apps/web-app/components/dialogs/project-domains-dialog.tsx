"use client";

import { ProjectDomainsPanel } from "@/components/project-domains-panel";

// Full-page screens retain their existing entry point; chat workspaces use the panel directly.
export function ProjectDomainsDialog(props: {
  projectId: string;
  projectSessionId?: string;
  iconOnly?: boolean;
}) {
  return <ProjectDomainsPanel {...props} mode="dialog" />;
}
