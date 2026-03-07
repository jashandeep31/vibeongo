"use client";

import { useState } from "react";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Badge } from "@repo/ui/components/badge";
import {
  Check,
  Cpu,
  Globe,
  Server,
  Code,
  Container,
  Github,
  Plus,
  Trash2,
  Terminal,
  FileCode,
  Bot,
  Sparkles,
} from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

const REGIONS = [
  {
    id: "us-east-1",
    name: "US East (N. Virginia)",
    icon: Globe,
  },
  {
    id: "us-east-2",
    name: "US East (Ohio)",
    icon: Globe,
  },
];

const INSTANCES = [
  {
    id: "t3.micro",
    name: "Starter",
    description: "Best for hobby projects and testing",
    cpu: "2 vCPU",
    ram: "1 GB RAM",
    price: "$5/mo",
    icon: Server,
  },
  {
    id: "t3.small",
    name: "Standard",
    description: "Good for small production workloads",
    cpu: "2 vCPU",
    ram: "2 GB RAM",
    price: "$10/mo",
    icon: Cpu,
  },
  {
    id: "t3.medium",
    name: "Pro",
    description: "For more demanding applications",
    cpu: "2 vCPU",
    ram: "4 GB RAM",
    price: "$20/mo",
    icon: Server,
  },
];

export default function ClientView() {
  const [projectName, setProjectName] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("us-east-1");
  const [selectedInstance, setSelectedInstance] = useState("t3.small");

  // GitHub specific state
  const [repositories, setRepositories] = useState([
    { id: Date.now(), url: "", token: "" },
  ]);

  const addRepository = () => {
    setRepositories([...repositories, { id: Date.now(), url: "", token: "" }]);
  };

  const updateRepository = (
    id: number,
    field: "url" | "token",
    value: string,
  ) => {
    setRepositories(
      repositories.map((repo) =>
        repo.id === id ? { ...repo, [field]: value } : repo,
      ),
    );
  };

  const removeRepository = (id: number) => {
    if (repositories.length > 1) {
      setRepositories(repositories.filter((repo) => repo.id !== id));
    }
  };

  // Ports Configuration State
  const [ports, setPorts] = useState([
    { id: Date.now(), port: "80", protocol: "TCP" },
    { id: Date.now() + 1, port: "443", protocol: "TCP" },
  ]);

  const addPort = () => {
    setPorts([...ports, { id: Date.now(), port: "", protocol: "TCP" }]);
  };

  const updatePort = (
    id: number,
    field: "port" | "protocol",
    value: string,
  ) => {
    setPorts(
      ports.map((p) =>
        p.id === id ? { ...p, [field]: value } : p,
      ),
    );
  };

  const removePort = (id: number) => {
    setPorts(ports.filter((p) => p.id !== id));
  };

  // Add-ons State
  const [enableDocker, setEnableDocker] = useState(false);
  const [enableOpencode, setEnableOpencode] = useState(false);
  const [enableTmux, setEnableTmux] = useState(false);
  const [enableNvim, setEnableNvim] = useState(false);
  const [enableCodex, setEnableCodex] = useState(false);
  const [enableClaudeCode, setEnableClaudeCode] = useState(false);

  // Docker specific state
  const [enablePostgres, setEnablePostgres] = useState(false);

  // Opencode specific state
  const [opencodePassword, setOpencodePassword] = useState("");
  const [opencodeApiProvider, setOpencodeApiProvider] = useState("openai");
  const [opencodeApiKey, setOpencodeApiKey] = useState("");

  // Nvim specific state
  const [nvimConfigUrl, setNvimConfigUrl] = useState("");

  return (
    <div className=" p-8 ">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create project</h1>
        <p className="text-muted-foreground mt-2">
          Set up a new deployment environment for your application.
        </p>
      </div>

      <div className="space-y-8 mt-8">
        {/* Project Name */}
        <div className="space-y-3">
          <Label htmlFor="project-name" className="text-base font-semibold">
            Project Name
          </Label>
          <Input
            id="project-name"
            placeholder="my-awesome-project"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="max-w-md h-10"
          />
        </div>

        {/* Region Selection */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Deployment Region</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            {REGIONS.map((region) => {
              const Icon = region.icon;
              const isSelected = selectedRegion === region.id;

              return (
                <div
                  key={region.id}
                  onClick={() => setSelectedRegion(region.id)}
                  className={cn(
                    "relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center">
                      <div className="text-sm">
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          {region.name}
                        </div>
                        <div className="text-muted-foreground mt-1">
                          {region.id}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="h-5 w-5 text-primary" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Instance Type Selection */}
        {selectedRegion && (
          <div className="space-y-4 pt-6 border-t">
            <div>
              <Label className="text-base font-semibold">Instance Type</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Select the computing resources for your project.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {INSTANCES.map((instance) => {
                const Icon = instance.icon;
                const isSelected = selectedInstance === instance.id;

                return (
                  <Card
                    key={instance.id}
                    onClick={() => setSelectedInstance(instance.id)}
                    className={cn(
                      "cursor-pointer transition-all",
                      isSelected
                        ? "border-primary ring-1 ring-primary bg-primary/5"
                        : "hover:border-primary/50",
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <Icon className="w-5 h-5 text-muted-foreground mb-2" />
                        {isSelected && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <CardTitle className="text-lg">{instance.name}</CardTitle>
                      <CardDescription className="line-clamp-2 min-h-[40px]">
                        {instance.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-muted-foreground mb-4">
                        <div className="flex justify-between">
                          <span>CPU</span>
                          <span className="font-medium text-foreground">
                            {instance.cpu}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>RAM</span>
                          <span className="font-medium text-foreground">
                            {instance.ram}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-end justify-between mt-4 pt-4 border-t">
                        <div className="font-semibold text-foreground">
                          {instance.price}
                        </div>
                        <Badge variant="secondary">{instance.id}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Repository Configuration */}
        <div className="space-y-4 pt-6 border-t">
          <div>
            <Label className="text-base font-semibold">
              Repository Configuration
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your GitHub repositories to automatically clone and push
              changes.
            </p>
          </div>

          <div className="space-y-4  gap-4 grid grid-cols-1 md:grid-cols-2">
            {repositories.map((repo, index) => (
              <div
                key={repo.id}
                className="relative rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:bg-muted/50 hover:text-destructive"
                  onClick={() => removeRepository(repo.id)}
                  disabled={repositories.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                <div className="grid grid-cols-1 gap-4 pr-8">
                  <div className="space-y-2">
                    <Label
                      className="text-sm font-medium"
                      htmlFor={`github-url-${repo.id}`}
                    >
                      GitHub Repository URL
                    </Label>
                    <div className="relative">
                      <Github className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id={`github-url-${repo.id}`}
                        placeholder="https://github.com/user/repo"
                        value={repo.url}
                        onChange={(e) =>
                          updateRepository(repo.id, "url", e.target.value)
                        }
                        className="pl-8 bg-background h-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label
                      className="text-sm font-medium"
                      htmlFor={`github-token-${repo.id}`}
                    >
                      Personal Access Token
                    </Label>
                    <Input
                      id={`github-token-${repo.id}`}
                      type="password"
                      placeholder="ghp_..."
                      value={repo.token}
                      onChange={(e) =>
                        updateRepository(repo.id, "token", e.target.value)
                      }
                      className="bg-background h-9"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="col-span-1 md:col-span-2 flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRepository}
                className="w-full border-dashed bg-transparent border-border hover:border-primary/50 hover:bg-muted/50 transition-all h-9"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Repository
              </Button>
            </div>
          </div>
        </div>

        {/* Network & Firewall Configuration */}
        <div className="space-y-4 pt-6 border-t">
          <div>
            <Label className="text-base font-semibold">Network & Firewall</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Configure inbound port rules to expose your services to the internet.
            </p>
          </div>

          <div className="space-y-4 max-w-3xl bg-secondary/10 p-4 rounded-xl border border-border/50">
            <div className="hidden md:grid grid-cols-12 gap-4 pb-2 border-b border-border/50 text-sm font-medium text-muted-foreground px-1">
              <div className="col-span-5">Port</div>
              <div className="col-span-5">Protocol</div>
              <div className="col-span-2"></div>
            </div>

            {ports.map((portRule, index) => (
              <div key={portRule.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-end md:items-center bg-background/50 md:bg-transparent p-3 md:p-0 rounded-lg border border-border/50 md:border-none">
                <div className="col-span-1 md:col-span-5 space-y-1 md:space-y-0">
                  <Label className="text-xs md:hidden">Port</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 8080"
                    value={portRule.port}
                    onChange={(e) => updatePort(portRule.id, "port", e.target.value)}
                    className="h-9 bg-background md:bg-transparent"
                  />
                </div>
                <div className="col-span-1 md:col-span-5 space-y-1 md:space-y-0">
                  <Label className="text-xs md:hidden">Protocol</Label>
                  <Select
                    value={portRule.protocol}
                    onValueChange={(val) => updatePort(portRule.id, "protocol", val)}
                  >
                    <SelectTrigger className="h-9 bg-background md:bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TCP">TCP</SelectItem>
                      <SelectItem value="UDP">UDP</SelectItem>
                      <SelectItem value="Both">TCP/UDP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 md:col-span-2 flex justify-end md:justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-9 w-9"
                    onClick={() => removePort(portRule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPort}
                className="w-full border-dashed bg-transparent border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50 transition-all h-9"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Port Rule
              </Button>
            </div>
          </div>
        </div>

        {/* Add-ons Configuration */}
        <div className="space-y-4 pt-6 border-t">
          <div>
            <Label className="text-base font-semibold">
              Additional Services
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Enable optional services for your environment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Docker Option */}
            <div
              className={cn(
                "border rounded-lg p-5 transition-all h-fit",
                enableDocker
                  ? "border-primary/50 bg-primary/5"
                  : "border-border",
              )}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="enable-docker"
                  checked={enableDocker}
                  onCheckedChange={(c) => setEnableDocker(c as boolean)}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="enable-docker"
                    className="text-base font-medium cursor-pointer flex items-center gap-2"
                  >
                    <Container className="w-4 h-4" />
                    Docker Engine
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Pre-install Docker and run popular containers.
                  </p>
                </div>
              </div>

              {enableDocker && (
                <div className="mt-5 pl-7 space-y-4 border-t pt-4 border-border/50">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">
                      Predefined Containers
                    </Label>
                    <div className="flex items-center space-x-2 bg-background/50 p-2 rounded-md border border-border/50">
                      <Checkbox
                        id="container-postgres"
                        checked={enablePostgres}
                        onCheckedChange={(c) => setEnablePostgres(c as boolean)}
                      />
                      <Label
                        htmlFor="container-postgres"
                        className="text-sm font-medium cursor-pointer"
                      >
                        PostgreSQL Database
                      </Label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Opencode Option */}
            <div
              className={cn(
                "border rounded-lg p-5 transition-all h-fit",
                enableOpencode
                  ? "border-primary/50 bg-primary/5"
                  : "border-border",
              )}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="enable-opencode"
                  checked={enableOpencode}
                  onCheckedChange={(c) => setEnableOpencode(c as boolean)}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="enable-opencode"
                    className="text-base font-medium cursor-pointer flex items-center gap-2"
                  >
                    <Code className="w-4 h-4" />
                    Opencode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Set up an Opencode remote development environment.
                  </p>
                </div>
              </div>

              {enableOpencode && (
                <div className="mt-5 pl-7 space-y-4 border-t pt-4 border-border/50">
                  <div className="space-y-2">
                    <Label htmlFor="opencode-password">Access Password</Label>
                    <Input
                      id="opencode-password"
                      type="password"
                      placeholder="Enter a secure password"
                      value={opencodePassword}
                      onChange={(e) => setOpencodePassword(e.target.value)}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>API Provider</Label>
                    <Select
                      value={opencodeApiProvider}
                      onValueChange={setOpencodeApiProvider}
                    >
                      <SelectTrigger className="w-full bg-background h-8">
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="google">Google Gemini</SelectItem>
                        <SelectItem value="claude">
                          Claude (Anthropic)
                        </SelectItem>
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
                      onChange={(e) => setOpencodeApiKey(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tmux Option */}
            <div
              className={cn(
                "border rounded-lg p-5 transition-all h-fit",
                enableTmux
                  ? "border-primary/50 bg-primary/5"
                  : "border-border",
              )}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="enable-tmux"
                  checked={enableTmux}
                  onCheckedChange={(c) => setEnableTmux(c as boolean)}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="enable-tmux"
                    className="text-base font-medium cursor-pointer flex items-center gap-2"
                  >
                    <Terminal className="w-4 h-4" />
                    Tmux
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Terminal multiplexer for managing multiple sessions.
                  </p>
                </div>
              </div>
            </div>

            {/* Neovim Option */}
            <div
              className={cn(
                "border rounded-lg p-5 transition-all h-fit",
                enableNvim
                  ? "border-primary/50 bg-primary/5"
                  : "border-border",
              )}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="enable-nvim"
                  checked={enableNvim}
                  onCheckedChange={(c) => setEnableNvim(c as boolean)}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="enable-nvim"
                    className="text-base font-medium cursor-pointer flex items-center gap-2"
                  >
                    <FileCode className="w-4 h-4" />
                    Neovim
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Hyperextensible Vim-based text editor.
                  </p>
                </div>
              </div>

              {enableNvim && (
                <div className="mt-5 pl-7 space-y-4 border-t pt-4 border-border/50">
                  <div className="space-y-2">
                    <Label htmlFor="nvim-config-url">Custom Config Repository (Optional)</Label>
                    <div className="relative">
                      <Github className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="nvim-config-url"
                        placeholder="https://github.com/user/nvim-config"
                        value={nvimConfigUrl}
                        onChange={(e) => setNvimConfigUrl(e.target.value)}
                        className="pl-8 bg-background"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Codex Option */}
            <div
              className={cn(
                "border rounded-lg p-5 transition-all h-fit",
                enableCodex
                  ? "border-primary/50 bg-primary/5"
                  : "border-border",
              )}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="enable-codex"
                  checked={enableCodex}
                  onCheckedChange={(c) => setEnableCodex(c as boolean)}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="enable-codex"
                    className="text-base font-medium cursor-pointer flex items-center gap-2"
                  >
                    <Bot className="w-4 h-4" />
                    Codex
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enable OpenAI Codex AI assistant for your environment.
                  </p>
                </div>
              </div>
            </div>

            {/* Claude Code Option */}
            <div
              className={cn(
                "border rounded-lg p-5 transition-all h-fit",
                enableClaudeCode
                  ? "border-primary/50 bg-primary/5"
                  : "border-border",
              )}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="enable-claude-code"
                  checked={enableClaudeCode}
                  onCheckedChange={(c) => setEnableClaudeCode(c as boolean)}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="enable-claude-code"
                    className="text-base font-medium cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Claude Code
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enable Anthropic Claude Code assistant.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6">
          <Button
            size="lg"
            className="w-full sm:w-auto"
            disabled={!projectName || !selectedRegion || !selectedInstance}
          >
            Create Project
          </Button>
        </div>
      </div>
    </div>
  );
}
