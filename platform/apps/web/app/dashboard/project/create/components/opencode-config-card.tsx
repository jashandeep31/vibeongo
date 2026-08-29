"use client";

import { Checkbox } from "@repo/ui/components/checkbox";
import { Label } from "@repo/ui/components/label";
import { Terminal } from "lucide-react";
import { memo, type ChangeEvent } from "react";
import { useConfigStore } from "@/store/config-store";
import { Input } from "@repo/ui/components/input";
import SensitiveAuthJsonField from "./sensitive-auth-json-field";

function OpencodeConfigCard() {
  const additionalServices = useConfigStore((s) => s.additionalServices);
  const updateOpencodeConfig = useConfigStore((s) => s.updateOpencodeConfig);
  const authJson = additionalServices.opencodeConfig.authJson;
  const useUserConfig = additionalServices.opencodeConfig.useUserConfig;
  const model = additionalServices.opencodeConfig.model;

  const onAuthJsonChange = (authJsonValue: string) => {
    updateOpencodeConfig({
      authJson: authJsonValue,
      useUserConfig,
      model,
    });
  };

  const onModelChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateOpencodeConfig({
      authJson,
      useUserConfig,
      model: e.target.value,
    });
  };

  const onUseUserConfigChange = (checked: boolean) => {
    updateOpencodeConfig({
      authJson,
      useUserConfig: checked,
      model,
    });
  };

  return (
    <div className="bg-card border-border max-w-full min-w-0 overflow-hidden rounded-lg border p-3">
      <div className="max-w-full min-w-0 space-y-3">
        <div>
          <Label
            htmlFor="opencode-model"
            className="text-foreground flex items-center text-sm font-medium"
          >
            <Terminal className="mr-2 size-4" />
            OpenCode
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="opencode-use-user-config"
            checked={useUserConfig}
            onCheckedChange={(checked) =>
              onUseUserConfigChange(checked === true)
            }
          />
          <Label
            htmlFor="opencode-use-user-config"
            className="cursor-pointer text-xs"
          >
            Use configuration from account settings
          </Label>
        </div>

        <div className="min-w-0">
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="opencode-model" className="text-xs">
              AI model
            </Label>
            <Input
              id="opencode-model"
              value={model}
              onChange={onModelChange}
              placeholder="default"
              className="h-8 max-w-full min-w-0"
            />
          </div>
        </div>
        {!useUserConfig ? (
          <SensitiveAuthJsonField
            id="opencode-authjson"
            serviceName="OpenCode"
            value={authJson}
            onChange={onAuthJsonChange}
          />
        ) : null}
      </div>
    </div>
  );
}

export default memo(OpencodeConfigCard);
