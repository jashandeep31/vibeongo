"use client";

import { useGetProjectConfigForEdit } from "@/hooks/use-project";
import { useConfigStore } from "@/store/config-store";
import { useEffect, useRef } from "react";
import ProjectConfigForm from "../../create/components/project-config-form";
import ConfigPreviewAndUpdate from "./config-preview-and-update";

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

const ClientView = ({ projectId }: { projectId: string }) => {
  const {
    data: projectConfig,
    isLoading,
    isError,
  } = useGetProjectConfigForEdit(projectId);
  const hydratedProjectIdRef = useRef<string | null>(null);
  const setProjectName = useConfigStore((state) => state.setProjectName);
  const setInstanceTypeId = useConfigStore((state) => state.setInstanceTypeId);
  const setInstanceRegion = useConfigStore((state) => state.setInstanceRegion);
  const setGitRepoIds = useConfigStore((state) => state.setGitRepoIds);
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
  const updateNvimConfig = useConfigStore((state) => state.updateNvimConfig);

  useEffect(() => {
    if (!projectConfig) return;
    if (hydratedProjectIdRef.current === projectConfig.project.id) return;

    const config = projectConfig.config as ProjectConfig;
    const dockerPackage = getPackage(config, "docker");
    const opencodePackage = getPackage(config, "opencode");
    const nvimPackage = getPackage(config, "nvim");

    setProjectName(projectConfig.project.name);
    setInstanceTypeId(projectConfig.instanceTypeId);
    setInstanceRegion(projectConfig.instanceRegionId ?? "");
    setGitRepoIds(projectConfig.githubRepoIds);
    setSshKeys(projectConfig.sshKeyIds);
    setInitialScript(projectConfig.project.initial_script ?? "");
    setFinalScript(projectConfig.project.final_script ?? "");
    setDevScript(projectConfig.project.dev_script ?? "");
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

    updateNvimConfig({
      enabled: nvimPackage?.enabled ?? false,
      config:
        typeof nvimPackage?.config?.config_url === "string"
          ? nvimPackage.config.config_url
          : "",
    });
    hydratedProjectIdRef.current = projectConfig.project.id;
  }, [
    projectConfig,
    setGitRepoIds,
    setInstanceTypeId,
    setInstanceRegion,
    setPortRules,
    setProjectName,
    setInitialScript,
    setFinalScript,
    setDevScript,
    setSshKeys,
    updateDockerConfig,
    updateNvimConfig,
    updateOpencodeConfig,
  ]);

  if (isLoading) {
    return (
      <div className="text-muted-foreground p-4 md:p-8">Loading project...</div>
    );
  }

  if (isError || !projectConfig) {
    return (
      <div className="p-4 md:p-8">
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border p-4">
          Failed to load project details.
        </div>
      </div>
    );
  }

  return (
    <ProjectConfigForm
      title="Edit project"
      description="Update this project's deployment configuration."
      showImportFrom={false}
      submitAction={<ConfigPreviewAndUpdate projectId={projectId} />}
    />
  );
};

export default ClientView;
