"use client";

import InstanceRegionCards from "./components/instance-region-cards";
import InstanceTypeCards from "./components/instance-type-cards";
import { useState } from "react";
import GitRepoConfigCard from "./components/git-repo-config-card";
import SshKeysCard from "./components/ssh-keys-card";
import NetworkFirewallCard from "./components/network-firewall-card";
import AdditionalServices from "./components/additional-services";
import { Button } from "@repo/ui/components/button";
import { createPortRule, type PortRule } from "./types";
import NameCard from "./components/name-card";
import { useConfigStore } from "@/store/config-store";

export default function ClientView() {
  const { gitRepos, projectName } = useConfigStore();

  const [selectedSshKeys, setSelectedSshKeys] = useState<string[]>([]);
  const [portRules, setPortRules] = useState<PortRule[]>(() => [
    createPortRule("80"),
    createPortRule("443"),
  ]);
  const [dockerEnabled, setDockerEnabled] = useState(false);
  const [dockerConfig, setDockerConfig] = useState();

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create project</h1>
        <p className="text-muted-foreground mt-2">
          Set up a new deployment environment for your application.
        </p>
      </div>
      <NameCard />
      <div>
        <InstanceRegionCards />
      </div>
      <div>
        <InstanceTypeCards />
      </div>
      <div>
        <GitRepoConfigCard />
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
      <div>
        {JSON.stringify({
          name: projectName,
          ssh_keys: selectedSshKeys.map((key) => key),
          ports: portRules,
          docker: dockerEnabled,
          gitRepos: gitRepos,
        })}
      </div>
    </div>
  );
}
