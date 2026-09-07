"use client";

import { CreateProjectFromTemplateDialog } from "@/components/dialogs/create-project-from-template-dialog";
import { useGetProjectTemplates } from "@repo/api-hooks";
import { Button } from "@repo/ui/components/button";
import { ArrowRight, Loader2 } from "lucide-react";

export default function ClientView() {
  const { data: templates = [], isPending, isError } = useGetProjectTemplates();

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 md:px-10 md:py-14">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          Project templates
        </h1>
      </header>

      <section
        aria-label="Project templates"
        className="divide-border mt-8 divide-y"
      >
        {isPending ? (
          <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading templates…
          </div>
        ) : isError ? (
          <p className="text-muted-foreground py-8 text-sm">
            Could not load project templates.
          </p>
        ) : templates.length === 0 ? (
          <p className="text-muted-foreground py-8 text-sm">
            No project templates are available yet.
          </p>
        ) : (
          templates.map((template) => {
            const services = template.config.packages
              .map((service) => service.name)
              .join(" · ");
            const ports = template.config.ports
              .map((port) => `${port.port}/${port.protocol.toLowerCase()}`)
              .join(" · ");

            return (
              <article
                key={template.id}
                className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <h2 className="font-mono text-sm font-semibold tracking-tight uppercase">
                    {template.name}
                  </h2>
                  <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-6">
                    {template.description || "Ready-to-use project template"}
                  </p>
                  <p className="text-muted-foreground/70 mt-2 font-mono text-xs">
                    {[services, ports].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <CreateProjectFromTemplateDialog templateId={template.id}>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                  >
                    <ArrowRight />
                    Create project
                  </Button>
                </CreateProjectFromTemplateDialog>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
