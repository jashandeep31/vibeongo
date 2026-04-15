"use client";

import { Checkbox } from "@repo/ui/components/checkbox";
import { Label } from "@repo/ui/components/label";
import { Terminal } from "lucide-react";
import { Textarea } from "@repo/ui/components/textarea";
import { memo } from "react";
import { useConfigStore } from "@/store/config-store";

function OpencodeConfigCard() {
  const additionalServices = useConfigStore((s) => s.additionalServices);
  const updateOpencodeConfig = useConfigStore((s) => s.updateOpencodeConfig);
  const opencodeEnabled = additionalServices.opencodeConfig.enabled;
  const authJson = additionalServices.opencodeConfig.authJson;

  const onOpencodeEnabledChange = (enabled: boolean) => {
    updateOpencodeConfig({ enabled, authJson });
  };

  const onAuthJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateOpencodeConfig({
      enabled: opencodeEnabled,
      authJson: e.target.value,
    });
  };

  return (
    <div
      className={`rounded-lg border p-6 transition-colors ${
        opencodeEnabled
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "bg-card border-border"
      }`}
    >
      <div className="flex items-start space-x-3">
        <Checkbox
          onCheckedChange={(checked: boolean) =>
            onOpencodeEnabledChange(checked)
          }
          checked={opencodeEnabled}
          className="mt-1"
          id="opencode-checkbox"
        />
        <div className="w-full space-y-1">
          <Label
            htmlFor="opencode-checkbox"
            className="text-foreground flex cursor-pointer items-center text-base font-semibold"
          >
            <Terminal className="mr-2 h-5 w-5" />
            Opencode Integration
          </Label>
          <p className="text-muted-foreground text-sm">
            Setup and configure Opencode CLI agent.
          </p>

          {opencodeEnabled && (
            <div className="animate-in fade-in slide-in-from-top-4 w-full pt-6 duration-300">
              <div className="border-border mb-6 border-t"></div>

              <div className="space-y-4">
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
                  className="min-h-[100px] font-mono text-sm"
                />
                <p className="text-muted-foreground text-xs">
                  Provide auth configuration in JSON format for Opencode.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(OpencodeConfigCard);
