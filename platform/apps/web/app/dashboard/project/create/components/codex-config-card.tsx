"use client";

import { Label } from "@repo/ui/components/label";
import { Bot } from "lucide-react";
import { memo } from "react";
import { useConfigStore } from "@/store/config-store";
import SensitiveAuthJsonField from "./sensitive-auth-json-field";

function CodexConfigCard() {
  const additionalServices = useConfigStore((s) => s.additionalServices);
  const updateCodexConfig = useConfigStore((s) => s.updateCodexConfig);
  const authJson = additionalServices.codexConfig.authJson;

  const onAuthJsonChange = (authJsonValue: string) => {
    updateCodexConfig({
      authJson: authJsonValue,
    });
  };

  return (
    <div className="bg-card border-border max-w-full min-w-0 overflow-hidden rounded-lg border p-3">
      <div className="max-w-full min-w-0 space-y-3">
        <div>
          <Label
            htmlFor="codex-authjson"
            className="text-foreground flex items-center text-sm font-medium"
          >
            <Bot className="mr-2 size-4" />
            Codex
          </Label>
        </div>
        <SensitiveAuthJsonField
          id="codex-authjson"
          serviceName="Codex"
          value={authJson}
          onChange={onAuthJsonChange}
        />
      </div>
    </div>
  );
}

export default memo(CodexConfigCard);
