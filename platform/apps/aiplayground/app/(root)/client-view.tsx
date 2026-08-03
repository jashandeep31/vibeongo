"use client";

import { WorkComposer } from "@/components/work-composer";
import { playgroundProjects } from "@/lib/playground-projects";

export default function ClientView() {
  const projects = playgroundProjects.map(({ id, name }) => ({ id, name }));

  return <WorkComposer projects={projects} />;
}
