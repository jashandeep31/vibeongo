"use client";

import { ReactNode, useMemo, useState } from "react";
import AdditionalServices from "./additional-services";
import GitRepoConfigCard from "./git-repo-config-card";
import InstanceRegionCards from "./instance-region-cards";
import InstanceTypeCards from "./instance-type-cards";
import NameCard from "./name-card";
import ProjectScriptsCard from "./project-scripts-card";
import SshKeysCard from "./ssh-keys-card";
import {
  useGetProjectConfigForEdit,
  useGetProjects,
} from "@/hooks/use-project";
import { useConfigStore } from "@/store/config-store";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import { Import, Loader2 } from "lucide-react";

interface ProjectConfigFormProps {
  title: string;
  description: string;
  submitAction?: ReactNode;
  showImportFrom?: boolean;
}

type ProjectPackage = {
  name: string;
  enabled: boolean;
  config?: Record<string, unknown>;
};

type ProjectConfig = {
  ports?: {
    port: number | string;
    protocol: "TCP" | "UDP";
  }[];
  packages?: ProjectPackage[];
};

const getPackage = (config: ProjectConfig, name: string) =>
  config.packages?.find((projectPackage) => projectPackage.name === name);

export default function ProjectConfigForm({
  title,
  description,
  submitAction,
  showImportFrom = true,
}: ProjectConfigFormProps) {
  const { data: projects, isLoading: isProjectsLoading } = useGetProjects();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const {
    data: selectedProjectConfig,
    isFetching: isImportConfigFetching,
    isError: isImportConfigError,
  } = useGetProjectConfigForEdit(selectedProjectId || null);
  const setInstanceTypeId = useConfigStore((state) => state.setInstanceTypeId);
  const setInstanceRegion = useConfigStore((state) => state.setInstanceRegion);
  const setSshKeys = useConfigStore((state) => state.setSshKeys);
  const setInitialScript = useConfigStore((state) => state.setInitialScript);
  const setFinalScript = useConfigStore((state) => state.setFinalScript);
  const setDevScript = useConfigStore((state) => state.setDevScript);
  const setPortRules = useConfigStore((state) => state.setPortRules);
  const updateDockerConfig = useConfigStore(
    (state) => state.updateDockerConfig,
  );
  const updateOpencodeConfig = useConfigStore(
    (state) => state.updateOpencodeConfig,
  );
  const updateCodexConfig = useConfigStore((state) => state.updateCodexConfig);
  const updateNvimConfig = useConfigStore((state) => state.updateNvimConfig);
  const selectedProjectName = useMemo(
    () => projects?.find((project) => project.id === selectedProjectId)?.name,
    [projects, selectedProjectId],
  );

  const handleImportProjectConfig = () => {
    if (!selectedProjectConfig) return;

    const config = selectedProjectConfig.config as ProjectConfig;
    const dockerPackage = getPackage(config, "docker");
    const opencodePackage = getPackage(config, "opencode");
    const codexPackage = getPackage(config, "codex");
    const nvimPackage = getPackage(config, "nvim");

    setInstanceTypeId(selectedProjectConfig.instanceTypeId);
    setInstanceRegion(selectedProjectConfig.instanceRegionId ?? "");
    setSshKeys(selectedProjectConfig.sshKeyIds);
    setInitialScript(selectedProjectConfig.project.initial_script ?? "");
    setFinalScript(selectedProjectConfig.project.final_script ?? "");
    setDevScript(selectedProjectConfig.project.dev_script ?? "");
    setPortRules(
      config.ports?.map((rule) => ({
        id: crypto.randomUUID(),
        port: String(rule.port),
        protocol: rule.protocol,
      })) ?? [],
    );

    updateDockerConfig({
      enabled: dockerPackage?.enabled ?? false,
      containers:
        (
          dockerPackage?.config?.containers as
            | { name: string; content?: string }[]
            | undefined
        )?.map((container) => ({
          id: crypto.randomUUID(),
          name: container.name,
          content: container.content ?? "",
        })) ?? [],
    });

    updateOpencodeConfig({
      enabled: opencodePackage?.enabled ?? false,
      authJson: JSON.stringify(
        opencodePackage?.config?.auth_json ?? {},
        null,
        2,
      ),
      model:
        typeof opencodePackage?.config?.model === "string"
          ? opencodePackage.config.model
          : "",
      requirePassword:
        typeof opencodePackage?.config?.requirePassword === "boolean"
          ? opencodePackage.config.requirePassword
          : false,
    });

    updateCodexConfig({
      enabled: codexPackage?.enabled ?? false,
      authJson: JSON.stringify(codexPackage?.config?.auth_json ?? {}, null, 2),
    });

    updateNvimConfig({
      enabled: nvimPackage?.enabled ?? false,
      config:
        typeof nvimPackage?.config?.config_url === "string"
          ? nvimPackage.config.config_url
          : "",
    });
  };

  return (
    <div className="space-y-4 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-2">{description}</p>
      </div>

      {showImportFrom ? (
        <div className="border-border bg-muted/20 rounded-lg border p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <Label htmlFor="import-project-config">Import from project</Label>
              <p className="text-muted-foreground text-sm">
                Copy the instance, SSH keys, ports, scripts, and service
                settings from an existing project.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <NativeSelect
                id="import-project-config"
                className="w-full sm:w-72"
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                disabled={isProjectsLoading || !projects?.length}
              >
                <NativeSelectOption value="">
                  {isProjectsLoading
                    ? "Loading projects..."
                    : projects?.length
                      ? "Choose a project"
                      : "No projects available"}
                </NativeSelectOption>
                {projects?.map((project) => (
                  <NativeSelectOption key={project.id} value={project.id}>
                    {project.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>

              <Button
                type="button"
                onClick={handleImportProjectConfig}
                disabled={
                  !selectedProjectId ||
                  !selectedProjectConfig ||
                  isImportConfigFetching
                }
              >
                {isImportConfigFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Import className="h-4 w-4" />
                )}
                Import
              </Button>
            </div>
          </div>

          {selectedProjectName ? (
            <p className="text-muted-foreground mt-3 text-sm">
              Ready to import from{" "}
              <span className="text-foreground font-medium">
                {selectedProjectName}
              </span>
              .
            </p>
          ) : null}

          {isImportConfigError ? (
            <p className="text-destructive mt-3 text-sm">
              Failed to load this project config.
            </p>
          ) : null}
        </div>
      ) : null}
      <NameCard />
      <InstanceRegionCards />
      <InstanceTypeCards />
      <GitRepoConfigCard />
      <SshKeysCard />
      <AdditionalServices />
      <ProjectScriptsCard />
      {submitAction}
    </div>
  );
}
