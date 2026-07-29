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
  const model = additionalServices.opencodeConfig.model;
  const requirePassword = additionalServices.opencodeConfig.requirePassword;

  const onAuthJsonChange = (authJsonValue: string) => {
    updateOpencodeConfig({
      authJson: authJsonValue,
      model,
      requirePassword,
    });
  };

  const onModelChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateOpencodeConfig({
      authJson,
      model: e.target.value,
      requirePassword,
    });
  };

  const onRequirePasswordChange = (checked: boolean) => {
    updateOpencodeConfig({
      authJson,
      model,
      requirePassword: checked,
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

        <div className="grid min-w-0 gap-3 md:grid-cols-2">
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
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="opencode-require-password" className="text-xs">
              Access
            </Label>
            <div className="flex h-8 min-w-0 items-center gap-2 overflow-hidden rounded-md border px-2.5">
              <Checkbox
                id="opencode-require-password"
                checked={requirePassword}
                onCheckedChange={(checked) =>
                  onRequirePasswordChange(checked === true)
                }
              />
              <Label
                htmlFor="opencode-require-password"
                className="text-muted-foreground min-w-0 cursor-pointer truncate text-xs"
              >
                Require password
              </Label>
            </div>
          </div>
        </div>
        <SensitiveAuthJsonField
          id="opencode-authjson"
          serviceName="OpenCode"
          value={authJson}
          onChange={onAuthJsonChange}
        />
      </div>
    </div>
  );
}

export default memo(OpencodeConfigCard);
