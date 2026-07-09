"use client";

import { Checkbox } from "@repo/ui/components/checkbox";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import { CircleDot } from "lucide-react";
import { memo, type ChangeEvent } from "react";
import { useConfigStore } from "@/store/config-store";

function PiConfigCard() {
  const additionalServices = useConfigStore((s) => s.additionalServices);
  const updatePiConfig = useConfigStore((s) => s.updatePiConfig);
  const piEnabled = additionalServices.piConfig.enabled;
  const authJson = additionalServices.piConfig.authJson;

  const onPiEnabledChange = (enabled: boolean) => {
    updatePiConfig({ enabled, authJson });
  };

  const onAuthJsonChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    updatePiConfig({
      enabled: piEnabled,
      authJson: e.target.value,
    });
  };

  return (
    <div
      className={`rounded-lg border p-6 transition-colors ${
        piEnabled
          ? "border-primary bg-primary/5 ring-primary ring-1"
          : "bg-card border-border"
      }`}
    >
      <div className="flex items-start space-x-3">
        <Checkbox
          onCheckedChange={(checked: boolean) => onPiEnabledChange(checked)}
          checked={piEnabled}
          className="mt-1"
          id="pi-checkbox"
        />
        <div className="w-full space-y-1">
          <Label
            htmlFor="pi-checkbox"
            className="text-foreground flex cursor-pointer items-center text-base font-semibold"
          >
            <CircleDot className="mr-2 h-5 w-5" />
            Pi Integration
          </Label>
          <p className="text-muted-foreground text-sm">
            Setup and configure Pi agent.
          </p>

          {piEnabled && (
            <div className="animate-in fade-in slide-in-from-top-4 w-full pt-6 duration-300">
              <div className="border-border mb-6 border-t"></div>

              <div className="grid space-y-4 overflow-auto">
                <Label
                  htmlFor="pi-authjson"
                  className="text-foreground text-sm font-semibold"
                >
                  Auth JSON Configuration
                </Label>
                <Textarea
                  id="pi-authjson"
                  value={authJson}
                  onChange={onAuthJsonChange}
                  placeholder='{"token": "xyz..."}'
                  className="min-h-25 font-mono text-sm"
                />
                <p className="text-muted-foreground text-xs">
                  Provide auth configuration in JSON format for Pi.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(PiConfigCard);
