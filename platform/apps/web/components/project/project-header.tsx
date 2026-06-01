"use client";

import { buttonVariants } from "@repo/ui/components/button";
import { Project } from "./types";
import Link from "next/link";

interface ProjectHeaderProps {
  project: Project;
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
      <div>
        <div className="mb-2 flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 md:mt-0">
        <Link href={`/projects/${project.id}`} className={buttonVariants()}>
          Manage Instances
        </Link>
        <Link
          href={`/dashboard/project/${project.id}/manage/env`}
          className={buttonVariants({ variant: "secondary" })}
        >
          Manage ENV&apos;s
        </Link>
      </div>
    </div>
  );
}
