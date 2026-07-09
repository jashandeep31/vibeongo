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
    <div className="bg-card border-border rounded-lg border p-6">
      <div className="flex items-start space-x-3">
        <div className="w-full space-y-1">
          <Label
            htmlFor="codex-authjson"
            className="text-foreground flex items-center text-base font-semibold"
          >
            <Bot className="mr-2 h-5 w-5" />
            Codex Integration
          </Label>
          <p className="text-muted-foreground text-sm">
            Setup and configure Codex CLI agent.
          </p>

          <div className="w-full pt-6">
            <div className="border-border mb-6 border-t"></div>

            <SensitiveAuthJsonField
              id="codex-authjson"
              serviceName="Codex"
              value={authJson}
              onChange={onAuthJsonChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(CodexConfigCard);
