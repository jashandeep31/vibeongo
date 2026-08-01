"use client";

import { Label } from "@repo/ui/components/label";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Bot } from "lucide-react";
import { memo } from "react";
import { useConfigStore } from "@/store/config-store";
import SensitiveAuthJsonField from "./sensitive-auth-json-field";

function CodexConfigCard() {
  const additionalServices = useConfigStore((s) => s.additionalServices);
  const updateCodexConfig = useConfigStore((s) => s.updateCodexConfig);
  const authJson = additionalServices.codexConfig.authJson;
  const useUserConfig = additionalServices.codexConfig.useUserConfig;

  const onAuthJsonChange = (authJsonValue: string) => {
    updateCodexConfig({
      authJson: authJsonValue,
      useUserConfig,
    });
  };

  const onUseUserConfigChange = (checked: boolean) => {
    updateCodexConfig({ authJson, useUserConfig: checked });
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
        <div className="flex items-center gap-2">
          <Checkbox
            id="codex-use-user-config"
            checked={useUserConfig}
            onCheckedChange={(checked) =>
              onUseUserConfigChange(checked === true)
            }
          />
          <Label
            htmlFor="codex-use-user-config"
            className="cursor-pointer text-xs"
          >
            Use configuration from account settings
          </Label>
        </div>
        {!useUserConfig ? (
          <SensitiveAuthJsonField
            id="codex-authjson"
            serviceName="Codex"
            value={authJson}
            onChange={onAuthJsonChange}
          />
        ) : null}
      </div>
    </div>
  );
}

export default memo(CodexConfigCard);
