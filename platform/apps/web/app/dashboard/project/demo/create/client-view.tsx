"use client";

import { useState } from "react";

import { Button } from "@repo/ui/components/button";

import { AdditionalServicesSection } from "./components/additional-services-section";
import { DeploymentSection } from "./components/deployment-section";
import { INSTANCES, REGIONS } from "./components/options";
import { NetworkFirewallSection } from "./components/network-firewall-section";
import { ProjectBasicsSection } from "./components/project-basics-section";
import { RepositoryConfigurationSection } from "./components/repository-configuration-section";
import type { PortRule, Repository } from "./components/types";

const createId = () => Date.now() + Math.floor(Math.random() * 1000);

export default function ClientView() {
  const [projectName, setProjectName] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("us-east-1");
  const [selectedInstance, setSelectedInstance] = useState("t3.small");
  const [repositories, setRepositories] = useState<Repository[]>([
    { id: createId(), url: "", token: "" },
  ]);
  const [ports, setPorts] = useState<PortRule[]>([
    { id: createId(), port: "80", protocol: "TCP" },
    { id: createId(), port: "443", protocol: "TCP" },
  ]);
  const [enableDocker, setEnableDocker] = useState(false);
  const [enableOpencode, setEnableOpencode] = useState(false);
  const [enableTmux, setEnableTmux] = useState(false);
  const [enableNvim, setEnableNvim] = useState(false);
  const [enableCodex, setEnableCodex] = useState(false);
  const [enableClaudeCode, setEnableClaudeCode] = useState(false);
  const [enablePostgres, setEnablePostgres] = useState(false);
  const [opencodePassword, setOpencodePassword] = useState("");
  const [opencodeApiProvider, setOpencodeApiProvider] = useState("openai");
  const [opencodeApiKey, setOpencodeApiKey] = useState("");
  const [nvimConfigUrl, setNvimConfigUrl] = useState("");

  const addRepository = () => {
    setRepositories((current) => [
      ...current,
      { id: createId(), url: "", token: "" },
    ]);
  };

  const updateRepository = (
    id: number,
    field: "url" | "token",
    value: string,
  ) => {
    setRepositories((current) =>
      current.map((repo) =>
        repo.id === id ? { ...repo, [field]: value } : repo,
      ),
    );
  };

  const removeRepository = (id: number) => {
    setRepositories((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((repo) => repo.id !== id);
    });
  };

  const addPort = () => {
    setPorts((current) => [
      ...current,
      { id: createId(), port: "", protocol: "TCP" },
    ]);
  };

  const updatePort = (
    id: number,
    field: "port" | "protocol",
    value: string,
  ) => {
    setPorts((current) =>
      current.map((portRule) =>
        portRule.id === id ? { ...portRule, [field]: value } : portRule,
      ),
    );
  };

  const removePort = (id: number) => {
    setPorts((current) => current.filter((portRule) => portRule.id !== id));
  };

  return (
    <div className="p-8 opacity-5">
      <div className="mt-8 space-y-8">
        <ProjectBasicsSection
          projectName={projectName}
          onProjectNameChange={setProjectName}
        />

        <DeploymentSection
          regions={REGIONS}
          instances={INSTANCES}
          selectedRegion={selectedRegion}
          selectedInstance={selectedInstance}
          onRegionSelect={setSelectedRegion}
          onInstanceSelect={setSelectedInstance}
        />

        <RepositoryConfigurationSection
          repositories={repositories}
          onAddRepository={addRepository}
          onUpdateRepository={updateRepository}
          onRemoveRepository={removeRepository}
        />

        <NetworkFirewallSection
          ports={ports}
          onAddPort={addPort}
          onUpdatePort={updatePort}
          onRemovePort={removePort}
        />

        <AdditionalServicesSection
          enableDocker={enableDocker}
          enableOpencode={enableOpencode}
          enableTmux={enableTmux}
          enableNvim={enableNvim}
          enableCodex={enableCodex}
          enableClaudeCode={enableClaudeCode}
          enablePostgres={enablePostgres}
          opencodePassword={opencodePassword}
          opencodeApiProvider={opencodeApiProvider}
          opencodeApiKey={opencodeApiKey}
          nvimConfigUrl={nvimConfigUrl}
          onEnableDockerChange={setEnableDocker}
          onEnableOpencodeChange={setEnableOpencode}
          onEnableTmuxChange={setEnableTmux}
          onEnableNvimChange={setEnableNvim}
          onEnableCodexChange={setEnableCodex}
          onEnableClaudeCodeChange={setEnableClaudeCode}
          onEnablePostgresChange={setEnablePostgres}
          onOpencodePasswordChange={setOpencodePassword}
          onOpencodeApiProviderChange={setOpencodeApiProvider}
          onOpencodeApiKeyChange={setOpencodeApiKey}
          onNvimConfigUrlChange={setNvimConfigUrl}
        />

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
