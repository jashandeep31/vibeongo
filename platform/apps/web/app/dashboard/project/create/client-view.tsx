"use client";

import InstanceRegionCards from "./components/instance-region-cards";
import InstanceTypeCards from "./components/instance-type-cards";
import { useCallback, useState } from "react";
import { useInstanceTypesByRegionID } from "@/hooks/use-instance-metadata";
import GitRepoConfigCard from "./components/git-repo-config-card";
import SshKeysCard from "./components/ssh-keys-card";
import NetworkFirewallCard from "./components/network-firewall-card";
import AdditionalServices from "./components/additional-services";
import { Button } from "@repo/ui/components/button";
import {
  createGitRepoConfig,
  createPortRule,
  type GitRepoConfig,
  type PortRule,
} from "./types";
import NameCard from "./components/name-card";

export default function ClientView() {
  const [projectName, setProjectName] = useState<string>("demo-project-1");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedInstanceType, setSelectedInstanceType] = useState<
    string | null
  >(null);
  const [selectedSshKeys, setSelectedSshKeys] = useState<string[]>([]);
  const [portRules, setPortRules] = useState<PortRule[]>(() => [
    createPortRule("80"),
    createPortRule("443"),
  ]);
  const [dockerEnabled, setDockerEnabled] = useState(false);
  const [gitRepos, setGitRepos] = useState<GitRepoConfig[]>(() => [
    createGitRepoConfig(),
  ]);
  const {
    data: instanceTypes,
    isLoading: isInstanceTypesLoading,
    isFetching: isInstanceTypesFetching,
  } = useInstanceTypesByRegionID({
    regionId: selectedRegion,
  });

  const handleRegionChange = useCallback((region: string | null) => {
    setSelectedRegion(region);
    setSelectedInstanceType(null);
  }, []);

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create project</h1>
        <p className="text-muted-foreground mt-2">
          Set up a new deployment environment for your application.
        </p>
      </div>
      <NameCard projectName={projectName} setProjectName={setProjectName} />
      <div>
        <InstanceRegionCards
          selectedRegion={selectedRegion}
          setSelectedRegion={handleRegionChange}
        />
      </div>
      <div>
        <InstanceTypeCards
          instanceTypes={instanceTypes}
          selectedInstanceType={selectedInstanceType}
          setSelectedInstanceType={setSelectedInstanceType}
          isLoading={isInstanceTypesLoading || isInstanceTypesFetching}
        />
      </div>
      <div>
        <GitRepoConfigCard gitRepos={gitRepos} setGitRepos={setGitRepos} />
      </div>
      <div>
        <SshKeysCard
          selectedKeys={selectedSshKeys}
          onSelectedKeysChange={setSelectedSshKeys}
        />
      </div>
      <div>
        <NetworkFirewallCard rules={portRules} onRulesChange={setPortRules} />
      </div>
      <div>
        <AdditionalServices
          dockerEnabled={dockerEnabled}
          onDockerEnabledChange={setDockerEnabled}
        />
      </div>
      <div>
        <Button>Create Project</Button>
      </div>
    </div>
  );
}
