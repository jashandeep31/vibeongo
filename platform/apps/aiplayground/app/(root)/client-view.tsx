"use client";

import { WorkComposer } from "@/components/work-composer";
import { playgroundProjects } from "@/lib/playground-projects";

export default function ClientView() {
  const projects = playgroundProjects.map(({ id, name }) => ({ id, name }));

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <WorkComposer projects={projects} />
    </div>
  );
}
