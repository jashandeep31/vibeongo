"use client";

import { useGetDemoProjects, useImportDemoProjects } from "@repo/api-hooks";
import { useProjectsStore } from "@repo/app-store";
import { Button } from "@repo/ui/components/button";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ClientView() {
  const projects = useProjectsStore((store) => store.projects);
  const { data: demoProjects = [], isPending, isError } = useGetDemoProjects();
  const importDemoProjects = useImportDemoProjects();

  const handleImport = (ownername: string, reponame: string) => {
    importDemoProjects.mutate(
      { ownername, reponame },
      {
        onSuccess: () => toast.success("Demo project imported"),
        onError: () => toast.error("Could not import the demo project"),
      },
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pt-5 pb-12 sm:px-8 sm:pb-16">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">
          Import a demo project
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Choose a project to use as your starting point.
        </p>
      </div>

      <section aria-label="Demo projects" className="divide-border divide-y">
        {isPending ? (
          <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading demo projects…
          </div>
        ) : isError ? (
          <p className="text-muted-foreground py-8 text-sm">
            Could not load demo projects.
          </p>
        ) : (
          demoProjects.map((demo) => {
            const isImported = projects.some(
              (project) => project.name === demo.project.name,
            );
            const isImporting =
              importDemoProjects.isPending &&
              importDemoProjects.variables?.ownername === demo.ownername &&
              importDemoProjects.variables.reponame === demo.reponame;

            return (
              <div
                key={`${demo.ownername}/${demo.reponame}`}
                className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <h2 className="font-mono text-sm font-semibold tracking-tight uppercase">
                    {demo.project.name}
                  </h2>
                  <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-6">
                    {demo.description}
                  </p>
                  <p className="text-muted-foreground/70 mt-2 font-mono text-xs">
                    {demo.tags.join(" · ")}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  disabled={isImported || importDemoProjects.isPending}
                  onClick={() => handleImport(demo.ownername, demo.reponame)}
                >
                  {isImported ? (
                    <Check />
                  ) : isImporting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <ArrowRight />
                  )}
                  {isImported
                    ? "Imported"
                    : isImporting
                      ? "Importing…"
                      : "Import"}
                </Button>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
