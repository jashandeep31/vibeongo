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
    <Tabs defaultValue="services" className="w-full flex-col mt-8">
      <TabsList className="mb-4 bg-transparent p-0 flex-wrap h-auto justify-start gap-4">
        <TabsTrigger
          value="services"
          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-0 pb-2"
        >
          <Box className="w-4 h-4 mr-2" />
          Services
        </TabsTrigger>
        <TabsTrigger
          value="git"
          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-0 pb-2"
        >
          <FolderGit2 className="w-4 h-4 mr-2" />
          Git Config
        </TabsTrigger>
        <TabsTrigger
          value="env"
          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-0 pb-2"
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
                <CardTitle className="capitalize text-lg">{pkg.name}</CardTitle>
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
                          <span className="capitalize">{container.name}</span>
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
  );
}
