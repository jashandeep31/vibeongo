"use client";

import {
  Activity,
  Box,
  Check,
  Database,
  FolderGit2,
  Terminal,
  Network,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
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
  const configuredPackages = project.config.packages || [];

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
          value="repos"
          className="rounded-none px-0 pb-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          <FolderGit2 className="mr-2 h-4 w-4" />
          Repositories
        </TabsTrigger>
        <TabsTrigger
          value="ports"
          className="rounded-none px-0 pb-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          <Network className="mr-2 h-4 w-4" />
          Ports
        </TabsTrigger>
      </TabsList>

      {/* Tab: Services */}
      <TabsContent value="services" className="mt-0 space-y-4">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Installed Packages</CardTitle>
            <CardDescription>
              Services and packages configured on this instance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {configuredPackages.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {configuredPackages.map((pkg, idx) => (
                  <div
                    key={idx}
                    className="bg-background flex flex-col gap-3 rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-2 font-semibold capitalize">
                      {pkg.name === "docker" ? (
                        <Box className="h-4 w-4 text-blue-500" />
                      ) : pkg.name === "opencode" ? (
                        <Terminal className="h-4 w-4 text-orange-500" />
                      ) : (
                        <Activity className="text-primary h-4 w-4" />
                      )}
                      <span>{pkg.name}</span>
                    </div>

                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span>Configured</span>
                    </div>

                    {pkg.name === "docker" &&
                      pkg.config &&
                      pkg.config.containers &&
                      pkg.config.containers.length > 0 && (
                        <div className="mt-2 space-y-2 border-t pt-2">
                          <span className="text-muted-foreground text-xs font-medium">
                            Containers
                          </span>
                          {pkg.config.containers.map((c, cIdx) => (
                            <div
                              key={cIdx}
                              className="flex items-center gap-2 text-sm"
                            >
                              <Database className="text-primary h-3 w-3" />
                              <span>{c.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">
                No packages configured for this project.
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab: Repositories */}
      <TabsContent value="repos" className="mt-0 space-y-4">
        {project.config.repos && project.config.repos.length > 0 ? (
          project.config.repos.map((repo, idx) => (
            <Card key={idx} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center gap-3 pb-4">
                <div className="bg-primary/10 text-primary shrink-0 rounded-md p-2">
                  <FolderGit2 className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <CardTitle className="max-w-[200px] truncate text-base sm:max-w-[400px]">
                    {repo.git_url.split("/").pop()?.replace(".git", "") ||
                      "Repository"}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="mt-2 grid gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs font-medium">
                      Repository URL
                    </p>
                    <a
                      href={repo.git_url.replace(".git", "")}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-blue-500 hover:underline"
                    >
                      {repo.git_url}
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-muted-foreground text-sm">
            No repositories configured.
          </div>
        )}
      </TabsContent>

      {/* Tab: Ports */}
      <TabsContent value="ports" className="mt-0 space-y-4">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Open Ports</CardTitle>
            <CardDescription>
              Ports configured to be open on this instance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {project.config.ports && project.config.ports.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {project.config.ports.map((portInfo, idx) => (
                  <div
                    key={idx}
                    className="bg-muted/50 flex items-center gap-2 rounded-md border px-3 py-1.5"
                  >
                    <Network className="text-muted-foreground h-4 w-4" />
                    <span className="font-mono text-sm">{portInfo.port}</span>
                    <span className="text-muted-foreground bg-background rounded border px-1.5 text-xs uppercase">
                      {portInfo.protocol}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">
                No ports explicitly opened.
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
