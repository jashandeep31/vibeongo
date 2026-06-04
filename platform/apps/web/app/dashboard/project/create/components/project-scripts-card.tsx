"use client";

import { useConfigStore } from "@/store/config-store";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import { memo, type ChangeEvent } from "react";

function ProjectScriptsCard() {
  const initialScript = useConfigStore((state) => state.initialScript);
  const finalScript = useConfigStore((state) => state.finalScript);
  const setInitialScript = useConfigStore((state) => state.setInitialScript);
  const setFinalScript = useConfigStore((state) => state.setFinalScript);

  const onInitialScriptChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInitialScript(e.target.value);
  };

  const onFinalScriptChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setFinalScript(e.target.value);
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
          placeholder="Commands to run before project setup"
          className="min-h-32 max-w-3xl font-mono text-sm"
        />
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
          placeholder="Commands to run after project setup"
          className="min-h-32 max-w-3xl font-mono text-sm"
        />
      </div>
    </div>
  );
}

export default memo(ProjectScriptsCard);
