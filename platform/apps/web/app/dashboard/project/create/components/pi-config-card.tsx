"use client";

import { Label } from "@repo/ui/components/label";
import { Checkbox } from "@repo/ui/components/checkbox";
import { CircleDot } from "lucide-react";
import { memo } from "react";
import { useConfigStore } from "@/store/config-store";
import SensitiveAuthJsonField from "./sensitive-auth-json-field";

function PiConfigCard() {
  const additionalServices = useConfigStore((s) => s.additionalServices);
  const updatePiConfig = useConfigStore((s) => s.updatePiConfig);
  const authJson = additionalServices.piConfig.authJson;
  const useUserConfig = additionalServices.piConfig.useUserConfig;

  const onAuthJsonChange = (authJsonValue: string) => {
    updatePiConfig({
      authJson: authJsonValue,
      useUserConfig,
    });
  };

  const onUseUserConfigChange = (checked: boolean) => {
    updatePiConfig({ authJson, useUserConfig: checked });
  };

  return (
    <div className="bg-card border-border max-w-full min-w-0 overflow-hidden rounded-lg border p-3">
      <div className="max-w-full min-w-0 space-y-3">
        <div>
          <Label
            htmlFor="pi-authjson"
            className="text-foreground flex items-center text-sm font-medium"
          >
            <CircleDot className="mr-2 size-4" />
            Pi
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="pi-use-user-config"
            checked={useUserConfig}
            onCheckedChange={(checked) =>
              onUseUserConfigChange(checked === true)
            }
          />
          <Label
            htmlFor="pi-use-user-config"
            className="cursor-pointer text-xs"
          >
            Use configuration from account settings
          </Label>
        </div>
        {!useUserConfig ? (
          <SensitiveAuthJsonField
            id="pi-authjson"
            serviceName="Pi"
            value={authJson}
            onChange={onAuthJsonChange}
          />
        ) : null}
      </div>
    </div>
  );
}

export default memo(PiConfigCard);
