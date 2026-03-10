"use client";

import { useState } from "react";
import {
  Activity,
  Box,
  Check,
  Copy,
  Database,
  FileCode,
  FolderGit2,
  GitBranch,
  Terminal,
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
import { Project } from "./types";

interface ProjectTabsProps {
  project: Project;
}

export function ProjectTabs({ project }: ProjectTabsProps) {
  const [copiedEnv, setCopiedEnv] = useState<string | null>(null);

  const copyEnvToClipboard = (data: string, path: string) => {
    navigator.clipboard.writeText(data);
    setCopiedEnv(path);
    setTimeout(() => setCopiedEnv(null), 2000);
  };

  return (
    <Tabs defaultValue="services" className="mt-8 w-full flex-col">
      <TabsList className="mb-4 h-auto flex-wrap justify-start gap-4 bg-transparent p-0">
        <TabsTrigger
          value="services"
          className="rounded-none px-0 pb-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          <Box className="mr-2 h-4 w-4" />
          Services
        </TabsTrigger>
        <TabsTrigger
          value="git"
          className="rounded-none px-0 pb-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          <FolderGit2 className="mr-2 h-4 w-4" />
          Git Config
        </TabsTrigger>
        <TabsTrigger
          value="env"
          className="rounded-none px-0 pb-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          <FileCode className="mr-2 h-4 w-4" />
          Env Variables
        </TabsTrigger>
      </TabsList>

      {/* Tab: Services */}
      <TabsContent value="services" className="mt-0 space-y-4">
        {project.config.packages.map((pkg, idx) => (
          <Card key={idx} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
              <div className="bg-primary/10 shrink-0 rounded-md p-2">
                {pkg.name === "docker" ? (
                  <Box className="h-5 w-5 text-blue-500" />
                ) : pkg.name === "opencode" ? (
                  <Terminal className="h-5 w-5 text-orange-500" />
                ) : (
                  <Activity className="text-primary h-5 w-5" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <CardTitle className="text-lg capitalize">{pkg.name}</CardTitle>
                <CardDescription>
                  Service is installed and configured
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-6 pt-0">
              {pkg.name === "docker" && pkg.config.containers && (
                <div className="space-y-4">
                  <h4 className="text-muted-foreground mt-2 text-sm font-medium">
                    Active Containers
                  </h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {pkg.config.containers.map((container, cIdx) => (
                      <div
                        key={cIdx}
                        className="bg-background flex flex-col gap-2 rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-2 font-semibold">
                          <Database className="text-primary h-4 w-4" />
                          <span className="capitalize">{container.name}</span>
                        </div>
                        <div className="text-muted-foreground mt-2 text-sm">
                          Configured via:{" "}
                          <code className="bg-muted text-foreground ml-1 rounded px-1.5 py-0.5 text-xs">
                            {container.filename}
                          </code>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pkg.name === "opencode" && (
                <div className="text-muted-foreground mt-2 flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-500" />
                  Opencode agent is installed and ready.
                </div>
              )}

              {pkg.name !== "docker" && pkg.name !== "opencode" && (
                <div className="text-muted-foreground mt-2 flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-500" />
                  {pkg.name} is successfully installed on the system.
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      {/* Tab: Git Config */}
      <TabsContent value="git" className="mt-0 space-y-4">
        {project.config.git_config?.map((git, idx) => (
          <Card key={idx} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
              <div className="bg-primary/10 text-primary shrink-0 rounded-md p-2">
                <FolderGit2 className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1">
                <CardTitle className="max-w-[200px] truncate text-base sm:max-w-[400px]">
                  {git.repo_url.split("/").pop()?.replace(".git", "") ||
                    "Repository"}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="mt-1 flex h-4 items-center gap-1 px-1.5 text-[10px] font-normal"
                  >
                    <GitBranch className="h-3 w-3" />
                    {git.branch}
                  </Badge>
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="mt-2 grid gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1 text-xs font-medium">
                    Repository URL
                  </p>
                  <a
                    href={git.repo_url.replace(".git", "")}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-blue-500 hover:underline"
                  >
                    {git.repo_url}
                  </a>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs font-medium">
                    Clone Destination Path
                  </p>
                  <code className="bg-muted rounded px-2 py-1 text-xs break-all">
                    {git.path}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      {/* Tab: Env Configs */}
      <TabsContent value="env" className="mt-0 space-y-4">
        {project.config.env_configs?.map((env, idx) => (
          <Card key={idx} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="shrink-0 rounded-md bg-yellow-500/10 p-1.5 text-yellow-600 dark:text-yellow-500">
                  <FileCode className="h-4 w-4" />
                </div>
                <CardTitle className="truncate font-mono text-sm">
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
                    <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto border-t bg-slate-950 p-4 font-mono text-xs text-slate-50">
                <pre>
                  <code>{env.data}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>
    </Tabs>
  );
}
