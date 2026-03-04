"use client";

import { useState } from "react";
import {
  Activity,
  Box,
  Check,
  Clock,
  Copy,
  CreditCard,
  Database,
  Eye,
  EyeOff,
  FileCode,
  FolderGit2,
  GitBranch,
  Globe,
  HardDrive,
  Key,
  Network,
  Play,
  RefreshCw,
  Server,
  ShieldCheck,
  Square,
  Terminal,
  User,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/tabs";

// Mock data updated to match the new requirements
const MOCK_PROJECT_DATA = {
  id: "proj-1",
  name: "Production Web",
  status: "running",
  metrics: {
    uptime: "420h 15m",
    billing: {
      total: "$18.45",
      bandwidth: "$2.10",
      compute: "$16.35",
    },
  },
  config: {
    os: "ubuntu",
    system_user: {
      username: "ubuntu",
      password: "5",
      is_sudo_user: true,
    },
    packages: [
      {
        name: "docker",
        config: {
          containers: [
            {
              name: "postgres",
              compose_file_url:
                "https://l1.devsradar.com/postgres-docker-compose-file",
              filename: "postgres-docker-compose.yaml",
            },
          ],
        },
      },
      {
        name: "opencode",
        config: {
          command: "curl -fsSL https://opencode.ai/install | bash",
        },
      },
    ],
    git_config: [
      {
        repo_url: "https://github.com/vibeongo/platform.git",
        branch: "main",
        path: "/var/www/platform",
      },
      {
        repo_url: "https://github.com/vibeongo/docs.git",
        branch: "production",
        path: "/var/www/docs",
      },
    ],
    env_configs: [
      {
        path: "/var/www/platform/.env",
        data: "DATABASE_URL=postgres://user:pass@localhost:5432/db\nAPI_KEY=sk_test_1234567890abcdef\nNODE_ENV=production",
      },
      {
        path: "/var/www/docs/.env.local",
        data: "NEXT_PUBLIC_SITE_URL=https://docs.vibeongo.com",
      },
    ],
  },
};

export default function ProjectPage() {
  const project = MOCK_PROJECT_DATA;
  const [status, setStatus] = useState<"running" | "stopped">(
    project.status as any,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState<string | null>(null);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(project.config.system_user.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyEnvToClipboard = (data: string, path: string) => {
    navigator.clipboard.writeText(data);
    setCopiedEnv(path);
    setTimeout(() => setCopiedEnv(null), 2000);
  };

  return (
    <div className="flex-1 space-y-8 p-6 md:p-8 mx-auto w-full">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {project.name}
            </h1>
            {status === "running" ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border-0">
                Running
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="text-muted-foreground border-0"
              >
                Stopped
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            <Server className="w-4 h-4" /> ID: {project.id}
          </p>
        </div>

        {/* Actions Group */}
        <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
          {status === "running" ? (
            <>
              <Button variant="outline" size="lg">
                <Terminal className="w-4 h-4 mr-2" />
                SSH
              </Button>
              <Button variant="outline" size="lg">
                <Globe className="w-4 h-4 mr-2" />
                Opencode Web
              </Button>
              <Button variant="outline" size="lg">
                <RefreshCw className="w-4 h-4 mr-2" />
                Restart
              </Button>
              <Button
                variant="destructive"
                size="lg"
                onClick={() => setStatus("stopped")}
              >
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </>
          ) : (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              size="lg"
              onClick={() => setStatus("running")}
            >
              <Play className="w-4 h-4 mr-2" />
              Start
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Side: Configuration (75%) */}
        <div className="lg:w-3/4 space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <HardDrive className="w-5 h-5 text-muted-foreground" />
            System Information
          </h2>

          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* OS & Basic Info */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Operating System
                    </p>
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4" />
                      <span className="capitalize font-medium">
                        {project.config.os}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Privileges
                    </p>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm">
                        {project.config.system_user.is_sudo_user
                          ? "Sudo Access Granted"
                          : "Standard User"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Credentials */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Username
                    </p>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span className="font-medium">
                        {project.config.system_user.username}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Password
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-sm bg-muted px-3 py-1.5 rounded-md border flex-1 flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-muted-foreground" />
                        {showPassword
                          ? project.config.system_user.password
                          : "••••••••••••"}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={copyToClipboard}
                        title="Copy password"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="services" className="w-full flex-col mt-8">
            <TabsList className="mb-4 bg-transparent p-0 flex-wrap h-auto justify-start gap-4">
              <TabsTrigger
                value="services"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none   rounded-none px-0 pb-2"
              >
                <Box className="w-4 h-4 mr-2" />
                Services
              </TabsTrigger>
              <TabsTrigger
                value="git"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none   rounded-none px-0 pb-2"
              >
                <FolderGit2 className="w-4 h-4 mr-2" />
                Git Config
              </TabsTrigger>
              <TabsTrigger
                value="env"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none   rounded-none px-0 pb-2"
              >
                <FileCode className="w-4 h-4 mr-2" />
                Env Variables
              </TabsTrigger>
            </TabsList>

            {/* Tab: Services */}
            <TabsContent value="services" className="space-y-4 mt-0">
              {project.config.packages.map((pkg, idx) => (
                <Card key={idx} className="overflow-hidden">
                  <CardHeader className="flex flex-row items-center gap-3 pb-4">
                    <div className="p-2 bg-primary/10 rounded-md shrink-0">
                      {pkg.name === "docker" ? (
                        <Box className="w-5 h-5 text-blue-500" />
                      ) : pkg.name === "opencode" ? (
                        <Terminal className="w-5 h-5 text-orange-500" />
                      ) : (
                        <Activity className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <CardTitle className="capitalize text-lg">
                        {pkg.name}
                      </CardTitle>
                      <CardDescription>
                        Service is installed and configured
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 pt-0">
                    {pkg.name === "docker" && pkg.config.containers && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-muted-foreground mt-2">
                          Active Containers
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {pkg.config.containers.map((container, cIdx) => (
                            <div
                              key={cIdx}
                              className="border rounded-lg p-4 bg-background flex flex-col gap-2"
                            >
                              <div className="flex items-center gap-2 font-semibold">
                                <Database className="w-4 h-4 text-primary" />
                                <span className="capitalize">
                                  {container.name}
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground mt-2">
                                Configured via:{" "}
                                <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-xs ml-1">
                                  {container.filename}
                                </code>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {pkg.name === "opencode" && (
                      <div className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        Opencode agent is installed and ready.
                      </div>
                    )}

                    {pkg.name !== "docker" && pkg.name !== "opencode" && (
                      <div className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        {pkg.name} is successfully installed on the system.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Tab: Git Config */}
            <TabsContent value="git" className="space-y-4 mt-0">
              {project.config.git_config?.map((git, idx) => (
                <Card key={idx} className="overflow-hidden">
                  <CardHeader className="flex flex-row items-center gap-3 pb-4">
                    <div className="p-2 bg-primary/10 text-primary rounded-md shrink-0">
                      <FolderGit2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <CardTitle className="text-base truncate max-w-[200px] sm:max-w-[400px]">
                        {git.repo_url.split("/").pop()?.replace(".git", "") ||
                          "Repository"}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 px-1.5 font-normal flex items-center gap-1 mt-1"
                        >
                          <GitBranch className="w-3 h-3" />
                          {git.branch}
                        </Badge>
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="grid gap-4 text-sm mt-2">
                      <div>
                        <p className="text-muted-foreground text-xs font-medium mb-1">
                          Repository URL
                        </p>
                        <a
                          href={git.repo_url.replace(".git", "")}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-500 hover:underline break-all"
                        >
                          {git.repo_url}
                        </a>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs font-medium mb-1">
                          Clone Destination Path
                        </p>
                        <code className="bg-muted px-2 py-1 rounded text-xs break-all">
                          {git.path}
                        </code>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Tab: Env Configs */}
            <TabsContent value="env" className="space-y-4 mt-0">
              {project.config.env_configs?.map((env, idx) => (
                <Card key={idx} className="overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-1.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 rounded-md shrink-0">
                        <FileCode className="w-4 h-4" />
                      </div>
                      <CardTitle className="text-sm font-mono truncate">
                        {env.path}
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => copyEnvToClipboard(env.data, env.path)}
                    >
                      {copiedEnv === env.path ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1.5" />
                          Copy
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="bg-slate-950 text-slate-50 p-4 overflow-x-auto text-xs font-mono border-t">
                      <pre>
                        <code>{env.data}</code>
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Side: Usage & Billing (25%) */}
        <div className="lg:w-1/4 space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-muted-foreground" />
            Usage & Billing
          </h2>
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Total Charges
                </p>
                <p className="text-3xl font-bold">
                  {project.metrics.billing.total}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Current billing cycle
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Server className="w-4 h-4" /> Compute
                  </span>
                  <span className="font-medium">
                    {project.metrics.billing.compute}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Network className="w-4 h-4" /> Bandwidth
                  </span>
                  <span className="font-medium">
                    {project.metrics.billing.bandwidth}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Running Time
                </p>
                <p className="font-medium">{project.metrics.uptime}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
