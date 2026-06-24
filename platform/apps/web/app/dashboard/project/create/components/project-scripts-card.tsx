"use client";

import { useConfigStore } from "@/store/config-store";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import { memo, type ChangeEvent, useMemo } from "react";

const parseDevScriptWindows = (script: string) =>
  script
    .split(/^---\s*$/m)
    .map((part) => part.trim())
    .filter(Boolean);

function ProjectScriptsCard() {
  const initialScript = useConfigStore((state) => state.initialScript);
  const finalScript = useConfigStore((state) => state.finalScript);
  const devScript = useConfigStore((state) => state.devScript);
  const setInitialScript = useConfigStore((state) => state.setInitialScript);
  const setFinalScript = useConfigStore((state) => state.setFinalScript);
  const setDevScript = useConfigStore((state) => state.setDevScript);
  const devScriptWindows = useMemo(
    () => parseDevScriptWindows(devScript),
    [devScript],
  );

  const onInitialScriptChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInitialScript(e.target.value);
  };

  const onFinalScriptChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setFinalScript(e.target.value);
  };

  const onDevScriptChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setDevScript(e.target.value);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Label
          htmlFor="project-initial-script"
          className="text-muted-foreground text-sm"
        >
          Initial Script
        </Label>
        <Textarea
          id="project-initial-script"
          value={initialScript}
          onChange={onInitialScriptChange}
          maxLength={500}
          placeholder="Install languages, start databases, or prepare system dependencies."
          className="min-h-32 w-full max-w-full font-mono text-sm"
        />
        <p className="text-muted-foreground text-sm">
          Runs before repositories are cloned or repository setup scripts run.
          Use it for system-level preparation, such as installing languages,
          starting a database, or configuring shared tooling.
        </p>
      </div>

      <div className="space-y-3">
        <Label
          htmlFor="project-final-script"
          className="text-muted-foreground text-sm"
        >
          Final Script
        </Label>
        <Textarea
          id="project-final-script"
          value={finalScript}
          onChange={onFinalScriptChange}
          maxLength={500}
          placeholder="Run migrations, copy files, or build the project."
          className="min-h-32 w-full max-w-full font-mono text-sm"
        />
        <p className="text-muted-foreground text-sm">
          Runs after repositories are cloned and setup scripts finish. Use it
          for project-level work, such as database migrations, copying files, or
          building artifacts.
        </p>
      </div>
      <div className="space-y-3">
        <Label
          htmlFor="project-dev-script"
          className="text-muted-foreground text-sm"
        >
          Dev Script
        </Label>
        <Textarea
          id="project-dev-script"
          value={devScript}
          onChange={onDevScriptChange}
          maxLength={500}
          placeholder={`cd apps/web
pnpm dev
---
cd apps/server
pnpm dev`}
          className="min-h-32 w-full max-w-full font-mono text-sm"
        />
        <p className="text-muted-foreground text-sm">
          Runs last in a tmux session. Use it for long-running development
          servers, file watchers, or any command that should keep running while
          work continues. Add <code className="font-mono">---</code> on its own
          line to run the next part in a new tmux window.
        </p>
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            This will create {devScriptWindows.length} tmux{" "}
            {devScriptWindows.length === 1 ? "window" : "windows"}.
          </p>

          {devScriptWindows.length ? (
            <div className="space-y-3">
              {devScriptWindows.map((windowScript, index) => (
                <div
                  key={`${index}-${windowScript}`}
                  className="border-border rounded-md border"
                >
                  <div className="border-border bg-muted/40 flex items-center justify-between border-b px-3 py-2">
                    <p className="text-sm font-medium">
                      tmux window {index + 1}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      task-{index}
                    </p>
                  </div>
                  <pre className="max-h-48 overflow-auto p-3 text-sm whitespace-pre-wrap">
                    <code>{windowScript}</code>
                  </pre>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default memo(ProjectScriptsCard);
