"use client";

import { Checkbox } from "@repo/ui/components/checkbox";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import { Bot } from "lucide-react";
import { memo, type ChangeEvent } from "react";
import { useConfigStore } from "@/store/config-store";

function CodexConfigCard() {
  const additionalServices = useConfigStore((s) => s.additionalServices);
  const updateCodexConfig = useConfigStore((s) => s.updateCodexConfig);
  const codexEnabled = additionalServices.codexConfig.enabled;
  const authJson = additionalServices.codexConfig.authJson;

  const onCodexEnabledChange = (enabled: boolean) => {
    updateCodexConfig({ enabled, authJson });
  };

  const onAuthJsonChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    updateCodexConfig({
      enabled: codexEnabled,
      authJson: e.target.value,
    });
  };

  return (
    <div
      className={`rounded-lg border p-6 transition-colors ${
        codexEnabled
          ? "border-primary bg-primary/5 ring-primary ring-1"
          : "bg-card border-border"
      }`}
    >
      <div className="flex items-start space-x-3">
        <Checkbox
          onCheckedChange={(checked: boolean) => onCodexEnabledChange(checked)}
          checked={codexEnabled}
          className="mt-1"
          id="codex-checkbox"
        />
        <div className="w-full space-y-1">
          <Label
            htmlFor="codex-checkbox"
            className="text-foreground flex cursor-pointer items-center text-base font-semibold"
          >
            <Bot className="mr-2 h-5 w-5" />
            Codex Integration
          </Label>
          <p className="text-muted-foreground text-sm">
            Setup and configure Codex CLI agent.
          </p>

          {codexEnabled && (
            <div className="animate-in fade-in slide-in-from-top-4 w-full pt-6 duration-300">
              <div className="border-border mb-6 border-t"></div>

              <div className="grid space-y-4 overflow-auto">
                <Label
                  htmlFor="codex-authjson"
                  className="text-foreground text-sm font-semibold"
                >
                  Auth JSON Configuration
                </Label>
                <Textarea
                  id="codex-authjson"
                  value={authJson}
                  onChange={onAuthJsonChange}
                  placeholder='{"token": "xyz..."}'
                  className="min-h-25 font-mono text-sm"
                />
                <p className="text-muted-foreground text-xs">
                  Provide auth configuration in JSON format for Codex.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(CodexConfigCard);
