"use client";

import { useGetProjectConfigForEdit } from "@/hooks/use-project";
import { useConfigStore } from "@/store/config-store";
import { useEffect, useRef } from "react";
import ProjectConfigForm from "../../create/components/project-config-form";
import {
  formatAuthJsonForForm,
  getDockerContainers,
  getProjectPackage,
  type StoredProjectConfig,
} from "../../create/components/project-config-hydration";
import ConfigPreviewAndUpdate from "./config-preview-and-update";

const ClientView = ({ projectId }: { projectId: string }) => {
  const {
    data: projectConfig,
    isLoading,
    isError,
  } = useGetProjectConfigForEdit(projectId);
  const hydratedProjectIdRef = useRef<string | null>(null);
  const setProjectName = useConfigStore((state) => state.setProjectName);
  const setProvider = useConfigStore((state) => state.setProvider);
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
  const updateCodexConfig = useConfigStore((state) => state.updateCodexConfig);
  const updatePiConfig = useConfigStore((state) => state.updatePiConfig);
  const updateNvimConfig = useConfigStore((state) => state.updateNvimConfig);

  useEffect(() => {
    if (!projectConfig) return;
    if (hydratedProjectIdRef.current === projectConfig.project.id) return;

    const config = projectConfig.config as StoredProjectConfig;
    const dockerPackage = getProjectPackage(config, "docker");
    const opencodePackage = getProjectPackage(config, "opencode");
    const codexPackage = getProjectPackage(config, "codex");
    const piPackage = getProjectPackage(config, "pi");
    const nvimPackage = getProjectPackage(config, "nvim");

    setProjectName(projectConfig.project.name);
    setProvider(projectConfig.provider);
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
      containers: getDockerContainers(dockerPackage),
    });

    updateOpencodeConfig({
      authJson: formatAuthJsonForForm(opencodePackage?.config?.auth_json),
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
      authJson: formatAuthJsonForForm(codexPackage?.config?.auth_json),
    });

    updatePiConfig({
      authJson: formatAuthJsonForForm(piPackage?.config?.auth_json),
    });

    updateNvimConfig({
      config:
        typeof nvimPackage?.config?.config_url === "string"
          ? nvimPackage.config.config_url
          : "",
    });
    hydratedProjectIdRef.current = projectConfig.project.id;
  }, [
    projectConfig,
    setProvider,
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
    updateCodexConfig,
    updatePiConfig,
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
