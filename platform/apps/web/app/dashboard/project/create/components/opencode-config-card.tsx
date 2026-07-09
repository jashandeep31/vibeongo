"use client";

import { Checkbox } from "@repo/ui/components/checkbox";
import { Label } from "@repo/ui/components/label";
import { Terminal } from "lucide-react";
import { Textarea } from "@repo/ui/components/textarea";
import { memo, type ChangeEvent } from "react";
import { useConfigStore } from "@/store/config-store";
import { Input } from "@repo/ui/components/input";

function OpencodeConfigCard() {
  const additionalServices = useConfigStore((s) => s.additionalServices);
  const updateOpencodeConfig = useConfigStore((s) => s.updateOpencodeConfig);
  const authJson = additionalServices.opencodeConfig.authJson;
  const model = additionalServices.opencodeConfig.model;
  const requirePassword = additionalServices.opencodeConfig.requirePassword;

  const onAuthJsonChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    updateOpencodeConfig({
      authJson: e.target.value,
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
    <div className="border-primary bg-primary/5 ring-primary rounded-lg border p-6 ring-1">
      <div className="flex items-start space-x-3">
        <div className="w-full space-y-1">
          <Label
            htmlFor="opencode-model"
            className="text-foreground flex items-center text-base font-semibold"
          >
            <Terminal className="mr-2 h-5 w-5" />
            Opencode Integration
          </Label>
          <p className="text-muted-foreground text-sm">
            Setup and configure Opencode CLI agent.
          </p>

          <div className="w-full pt-6">
            <div className="border-border mb-6 border-t"></div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="mb-6 space-y-4">
                <Label
                  htmlFor="opencode-model"
                  className="text-foreground text-sm font-semibold"
                >
                  AI Model
                </Label>
                <Input
                  id="opencode-model"
                  value={model}
                  onChange={onModelChange}
                  placeholder="default"
                />
              </div>
              <div className="mb-6 space-y-4">
                <Label
                  htmlFor="opencode-require-password"
                  className="text-foreground text-sm font-semibold"
                >
                  Require Password
                </Label>
                <div className="flex items-center gap-3 rounded-md border px-3 py-2">
                  <Checkbox
                    id="opencode-require-password"
                    checked={requirePassword}
                    onCheckedChange={(checked) =>
                      onRequirePasswordChange(checked === true)
                    }
                  />
                  <Label
                    htmlFor="opencode-require-password"
                    className="text-muted-foreground cursor-pointer text-sm"
                  >
                    Require a password for Opencode access
                  </Label>
                </div>
              </div>
            </div>
            <div className="grid space-y-4 overflow-auto">
              <Label
                htmlFor="opencode-authjson"
                className="text-foreground text-sm font-semibold"
              >
                Auth JSON Configuration
              </Label>
              <Textarea
                id="opencode-authjson"
                value={authJson}
                onChange={onAuthJsonChange}
                placeholder='{"token": "xyz..."}'
                className="min-h-25 font-mono text-sm"
              />
              <p className="text-muted-foreground text-xs">
                Provide auth configuration in JSON format for Opencode.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(OpencodeConfigCard);
