"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import AdditionalServices from "./additional-services";
import GitRepoConfigCard from "./git-repo-config-card";
import InstanceRegionCards from "./instance-region-cards";
import InstanceTypeCards from "./instance-type-cards";
import NameCard from "./name-card";
import ProjectScriptsCard from "./project-scripts-card";
import ProjectConfigErrors from "./project-config-errors";
import { validateProjectConfig } from "./project-config-validation";
import ProviderCards from "./provider-cards";
import SshKeysCard from "./ssh-keys-card";
import {
  formatAuthJsonForForm,
  getDockerContainers,
  getProjectPackage,
  type StoredProjectConfig,
} from "./project-config-hydration";
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
  const setSandboxTypeId = useConfigStore((state) => state.setSandboxTypeId);
  const setProvider = useConfigStore((state) => state.setProvider);
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
  const updatePiConfig = useConfigStore((state) => state.updatePiConfig);
  const updateNvimConfig = useConfigStore((state) => state.updateNvimConfig);
  const projectName = useConfigStore((state) => state.projectName);
  const provider = useConfigStore((state) => state.provider);
  const instanceTypeId = useConfigStore((state) => state.instanceTypeId);
  const sandboxTypeId = useConfigStore((state) => state.sandboxTypeId);
  const instanceRegionId = useConfigStore((state) => state.instanceRegionId);
  const gitRepoIds = useConfigStore((state) => state.gitRepoIds);
  const sshKeys = useConfigStore((state) => state.sshKeys);
  const initialScript = useConfigStore((state) => state.initialScript);
  const finalScript = useConfigStore((state) => state.finalScript);
  const devScript = useConfigStore((state) => state.devScript);
  const portRules = useConfigStore((state) => state.portRules);
  const additionalServices = useConfigStore(
    (state) => state.additionalServices,
  );
  const hasAttemptedSubmit = useConfigStore(
    (state) => state.hasAttemptedSubmit,
  );
  const setSubmissionErrors = useConfigStore(
    (state) => state.setSubmissionErrors,
  );
  const resetSubmissionErrors = useConfigStore(
    (state) => state.resetSubmissionErrors,
  );
  const [isLiveValidationReady, setIsLiveValidationReady] = useState(false);
  const selectedProjectName = useMemo(
    () => projects?.find((project) => project.id === selectedProjectId)?.name,
    [projects, selectedProjectId],
  );

  useEffect(() => {
    resetSubmissionErrors();
    setIsLiveValidationReady(true);
  }, [resetSubmissionErrors]);

  useEffect(() => {
    if (!isLiveValidationReady || !hasAttemptedSubmit) return;

    setSubmissionErrors(validateProjectConfig(useConfigStore.getState()));
  }, [
    additionalServices,
    devScript,
    finalScript,
    gitRepoIds,
    hasAttemptedSubmit,
    initialScript,
    instanceRegionId,
    instanceTypeId,
    isLiveValidationReady,
    portRules,
    projectName,
    provider,
    setSubmissionErrors,
    sandboxTypeId,
    sshKeys,
  ]);

  const handleImportProjectConfig = () => {
    if (!selectedProjectConfig) return;

    const config = selectedProjectConfig.config as StoredProjectConfig;
    const dockerPackage = getProjectPackage(config, "docker");
    const opencodePackage = getProjectPackage(config, "opencode");
    const codexPackage = getProjectPackage(config, "codex");
    const piPackage = getProjectPackage(config, "pi");
    const nvimPackage = getProjectPackage(config, "nvim");

    setProvider(selectedProjectConfig.provider);
    setInstanceTypeId(selectedProjectConfig.instanceTypeId);
    setSandboxTypeId(selectedProjectConfig.sandboxTypeId ?? "");
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
      <ProviderCards />
      <InstanceRegionCards />
      <InstanceTypeCards />
      <GitRepoConfigCard />
      <SshKeysCard />
      <AdditionalServices />
      <ProjectScriptsCard />
      {submitAction}
      <ProjectConfigErrors />
    </div>
  );
}
