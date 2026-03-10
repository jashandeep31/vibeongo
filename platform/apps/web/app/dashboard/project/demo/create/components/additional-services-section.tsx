import type { ReactNode } from "react";

import { Checkbox } from "@repo/ui/components/checkbox";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { cn } from "@repo/ui/lib/utils";
import {
  Bot,
  Code,
  Container,
  FileCode,
  Github,
  Sparkles,
  Terminal,
  type LucideIcon,
} from "lucide-react";

type AdditionalServicesSectionProps = {
  enableDocker: boolean;
  enableOpencode: boolean;
  enableTmux: boolean;
  enableNvim: boolean;
  enableCodex: boolean;
  enableClaudeCode: boolean;
  enablePostgres: boolean;
  opencodePassword: string;
  opencodeApiProvider: string;
  opencodeApiKey: string;
  nvimConfigUrl: string;
  onEnableDockerChange: (checked: boolean) => void;
  onEnableOpencodeChange: (checked: boolean) => void;
  onEnableTmuxChange: (checked: boolean) => void;
  onEnableNvimChange: (checked: boolean) => void;
  onEnableCodexChange: (checked: boolean) => void;
  onEnableClaudeCodeChange: (checked: boolean) => void;
  onEnablePostgresChange: (checked: boolean) => void;
  onOpencodePasswordChange: (value: string) => void;
  onOpencodeApiProviderChange: (value: string) => void;
  onOpencodeApiKeyChange: (value: string) => void;
  onNvimConfigUrlChange: (value: string) => void;
};

type ServiceCardProps = {
  id: string;
  checked: boolean;
  icon: LucideIcon;
  title: string;
  description: string;
  onCheckedChange: (checked: boolean) => void;
  children?: ReactNode;
};

function ServiceCard({
  id,
  checked,
  icon: Icon,
  title,
  description,
  onCheckedChange,
  children,
}: ServiceCardProps) {
  return (
    <div
      className={cn(
        "h-fit rounded-lg border p-5 transition-all",
        checked ? "border-primary/50 bg-primary/5" : "border-border",
      )}
    >
      <div className="flex items-start space-x-3">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value as boolean)}
          className="mt-1"
        />
        <div className="space-y-1">
          <Label
            htmlFor={id}
            className="flex cursor-pointer items-center gap-2 text-base font-medium"
          >
            <Icon className="h-4 w-4" />
            {title}
          </Label>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>

      {checked && children ? (
        <div className="border-border/50 mt-5 space-y-4 border-t pt-4 pl-7">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function AdditionalServicesSection({
  enableDocker,
  enableOpencode,
  enableTmux,
  enableNvim,
  enableCodex,
  enableClaudeCode,
  enablePostgres,
  opencodePassword,
  opencodeApiProvider,
  opencodeApiKey,
  nvimConfigUrl,
  onEnableDockerChange,
  onEnableOpencodeChange,
  onEnableTmuxChange,
  onEnableNvimChange,
  onEnableCodexChange,
  onEnableClaudeCodeChange,
  onEnablePostgresChange,
  onOpencodePasswordChange,
  onOpencodeApiProviderChange,
  onOpencodeApiKeyChange,
  onNvimConfigUrlChange,
}: AdditionalServicesSectionProps) {
  return (
    <div className="space-y-4 border-t pt-6">
      <div>
        <Label className="text-base font-semibold">Additional Services</Label>
        <p className="text-muted-foreground mt-1 text-sm">
          Enable optional services for your environment.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ServiceCard
          id="enable-docker"
          checked={enableDocker}
          icon={Container}
          title="Docker Engine"
          description="Pre-install Docker and run popular containers."
          onCheckedChange={onEnableDockerChange}
        >
          <div className="space-y-3">
            <Label className="text-sm font-semibold">
              Predefined Containers
            </Label>
            <div className="border-border/50 bg-background/50 flex items-center space-x-2 rounded-md border p-2">
              <Checkbox
                id="container-postgres"
                checked={enablePostgres}
                onCheckedChange={(value) =>
                  onEnablePostgresChange(value as boolean)
                }
              />
              <Label
                htmlFor="container-postgres"
                className="cursor-pointer text-sm font-medium"
              >
                PostgreSQL Database
              </Label>
            </div>
          </div>
        </ServiceCard>

        <ServiceCard
          id="enable-opencode"
          checked={enableOpencode}
          icon={Code}
          title="Opencode"
          description="Set up an Opencode remote development environment."
          onCheckedChange={onEnableOpencodeChange}
        >
          <div className="space-y-2">
            <Label htmlFor="opencode-password">Access Password</Label>
            <Input
              id="opencode-password"
              type="password"
              placeholder="Enter a secure password"
              value={opencodePassword}
              onChange={(event) => onOpencodePasswordChange(event.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label>API Provider</Label>
            <Select
              value={opencodeApiProvider}
              onValueChange={onOpencodeApiProviderChange}
            >
              <SelectTrigger className="bg-background h-8 w-full">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="google">Google Gemini</SelectItem>
                <SelectItem value="claude">Claude (Anthropic)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="opencode-apikey">API Key</Label>
            <Input
              id="opencode-apikey"
              type="password"
              placeholder="sk-..."
              value={opencodeApiKey}
              onChange={(event) => onOpencodeApiKeyChange(event.target.value)}
              className="bg-background"
            />
          </div>
        </ServiceCard>

        <ServiceCard
          id="enable-tmux"
          checked={enableTmux}
          icon={Terminal}
          title="Tmux"
          description="Terminal multiplexer for managing multiple sessions."
          onCheckedChange={onEnableTmuxChange}
        />

        <ServiceCard
          id="enable-nvim"
          checked={enableNvim}
          icon={FileCode}
          title="Neovim"
          description="Hyperextensible Vim-based text editor."
          onCheckedChange={onEnableNvimChange}
        >
          <div className="space-y-2">
            <Label htmlFor="nvim-config-url">
              Custom Config Repository (Optional)
            </Label>
            <div className="relative">
              <Github className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                id="nvim-config-url"
                placeholder="https://github.com/user/nvim-config"
                value={nvimConfigUrl}
                onChange={(event) => onNvimConfigUrlChange(event.target.value)}
                className="bg-background pl-8"
              />
            </div>
          </div>
        </ServiceCard>

        <ServiceCard
          id="enable-codex"
          checked={enableCodex}
          icon={Bot}
          title="Codex"
          description="Enable OpenAI Codex AI assistant for your environment."
          onCheckedChange={onEnableCodexChange}
        />

        <ServiceCard
          id="enable-claude-code"
          checked={enableClaudeCode}
          icon={Sparkles}
          title="Claude Code"
          description="Enable Anthropic Claude Code assistant."
          onCheckedChange={onEnableClaudeCodeChange}
        />
      </div>
    </div>
  );
}
