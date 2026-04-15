"use client";

import { Checkbox } from "@repo/ui/components/checkbox";
import { Label } from "@repo/ui/components/label";
import { FileCode2 } from "lucide-react";
import { Input } from "@repo/ui/components/input";
import { memo } from "react";
import { useConfigStore } from "@/store/config-store";

function NvimConfigCard() {
  const additionalServices = useConfigStore((s) => s.additionalServices);
  const updateNvimConfig = useConfigStore((s) => s.updateNvimConfig);
  const nvimEnabled = additionalServices.nvimConfig.enabled;
  const configContent = additionalServices.nvimConfig.config;

  const onNvimEnabledChange = (enabled: boolean) => {
    updateNvimConfig({ enabled, config: configContent });
  };

  const onConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNvimConfig({ enabled: nvimEnabled, config: e.target.value });
  };

  return (
    <div
      className={`rounded-lg border p-6 transition-colors ${
        nvimEnabled
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "bg-card border-border"
      }`}
    >
      <div className="flex items-start space-x-3">
        <Checkbox
          onCheckedChange={(checked: boolean) => onNvimEnabledChange(checked)}
          checked={nvimEnabled}
          className="mt-1"
          id="nvim-checkbox"
        />
        <div className="w-full space-y-1">
          <Label
            htmlFor="nvim-checkbox"
            className="text-foreground flex cursor-pointer items-center text-base font-semibold"
          >
            <FileCode2 className="mr-2 h-5 w-5" />
            Neovim Environment
          </Label>
          <p className="text-muted-foreground text-sm">
            Setup Neovim with your custom dotfiles repository.
          </p>

          {nvimEnabled && (
            <div className="animate-in fade-in slide-in-from-top-4 w-full pt-6 duration-300">
              <div className="border-border mb-6 border-t"></div>

              <div className="space-y-4">
                <Label
                  htmlFor="nvim-config"
                  className="text-foreground text-sm font-semibold"
                >
                  Configuration (Git URL)
                </Label>
                <Input
                  id="nvim-config"
                  value={configContent}
                  onChange={onConfigChange}
                  placeholder="Provide a link to your dotfiles repo..."
                  className="font-mono text-sm"
                />
                <p className="text-muted-foreground text-xs">
                  We will clone the repository to your Neovim config directory.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(NvimConfigCard);
