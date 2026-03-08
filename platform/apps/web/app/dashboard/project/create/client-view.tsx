"use client";

import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import InstanceRegionCards from "./components/instance-region-cards";
import InstanceTypeCards from "./components/instance-type-cards";
import { useState } from "react";
import { useInstanceTypesByRegionID } from "@/hooks/use-instance-metadata";
import GitRepoConfig from "./components/git-repo-config-card";
import SshKeysCard from "./components/ssh-keys-card";
import NetworkFirewallCard, {
  PortRule,
} from "./components/network-firewall-card";
import AdditionalServices from "./components/additional-services";
import { Button } from "@repo/ui/components/button";

export interface GitRepoConfig {
  git_url: string;
  access_token: string;
}
export default function ClientView() {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedInstanceType, setSelectedInstanceType] = useState<
    string | null
  >(null);
  const [selectedSshKeys, setSelectedSshKeys] = useState<string[]>([]);
  const [portRules, setPortRules] = useState<PortRule[]>([
    { port: "80", protocol: "TCP" },
    { port: "443", protocol: "TCP" },
  ]);
  const [dockerEnabled, setDockerEnabled] = useState(false);
  const [selectedContainers, setSelectedContainers] = useState<string[]>([]);
  const [gitRepos, setGitRepos] = useState<GitRepoConfig[]>([
    {
      git_url: "",
      access_token: "",
    },
  ]);
  const { data } = useInstanceTypesByRegionID({ regionId: selectedRegion });

  const handleRegionChange = (region: string | null) => {
    setSelectedRegion(region);
    setSelectedInstanceType(null);
  };
  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create project</h1>
        <p className="mt-2 text-muted-foreground">
          Set up a new deployment environment for your application.
        </p>
      </div>
      <div className="space-y-3">
        <Label htmlFor="project-name" className="text-sm text-muted-foreground">
          Project Name
        </Label>
        <Input
          id="project-name"
          placeholder="my-awesome-project"
          className="h-10 max-w-md"
        />
      </div>
      <div>
        <InstanceRegionCards
          selectedRegion={selectedRegion}
          setSelectedRegion={handleRegionChange}
        />
      </div>
      <div>
        <InstanceTypeCards
          instanceTypes={data}
          selectedInstanceType={selectedInstanceType}
          setSelectedInstanceType={setSelectedInstanceType}
        />
      </div>
      <div>
        <GitRepoConfig gitRepos={gitRepos} setGitRepos={setGitRepos} />
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
          selectedContainers={selectedContainers}
          onSelectedContainersChange={setSelectedContainers}
        />
      </div>
      <div>
        <Button>Create Project</Button>
      </div>
    </div>
  );
}
