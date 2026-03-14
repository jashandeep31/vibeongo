"use client";

import { Checkbox } from "@repo/ui/components/checkbox";
import { Label } from "@repo/ui/components/label";
import { FileCode2 } from "lucide-react";
import { Textarea } from "@repo/ui/components/textarea";
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

  const onConfigChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNvimConfig({ enabled: nvimEnabled, config: e.target.value });
  };

  return (
    <div
      className={`rounded-lg border p-6 transition-colors ${
        nvimEnabled
          ? "border-green-500 bg-green-50/50 dark:bg-green-950/20"
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
            Setup Neovim with your custom dotfiles or lua configuration.
          </p>

          {nvimEnabled && (
            <div className="animate-in fade-in slide-in-from-top-4 w-full pt-6 duration-300">
              <div className="border-border mb-6 border-t"></div>

              <div className="space-y-4">
                <Label
                  htmlFor="nvim-config"
                  className="text-foreground text-sm font-semibold"
                >
                  Configuration (init.lua or Git URL)
                </Label>
                <Textarea
                  id="nvim-config"
                  value={configContent}
                  onChange={onConfigChange}
                  placeholder="Paste your init.lua content or provide a link to your dotfiles repo..."
                  className="h-32 resize-y font-mono text-sm whitespace-pre"
                />
                <p className="text-muted-foreground text-xs">
                  We will inject this configuration into `~/.config/nvim/init.lua` or clone the repository.
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
