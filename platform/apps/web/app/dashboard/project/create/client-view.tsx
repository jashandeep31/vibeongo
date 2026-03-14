"use client";

import InstanceRegionCards from "./components/instance-region-cards";
import InstanceTypeCards from "./components/instance-type-cards";
import GitRepoConfigCard from "./components/git-repo-config-card";
import SshKeysCard from "./components/ssh-keys-card";
import NetworkFirewallCard from "./components/network-firewall-card";
import AdditionalServices from "./components/additional-services";
import NameCard from "./components/name-card";
import ConfigPreviewAndCreate from "./components/config-preview-and-create";

export default function ClientView() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create project</h1>
        <p className="text-muted-foreground mt-2">
          Set up a new deployment environment for your application.
        </p>
      </div>
      <NameCard />
      <InstanceRegionCards />
      <InstanceTypeCards />
      <GitRepoConfigCard />
      <SshKeysCard />
      <NetworkFirewallCard />
      <AdditionalServices />
      <ConfigPreviewAndCreate />
    </div>
  );
}

