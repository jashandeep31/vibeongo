"use client";

import { ReactNode } from "react";
import AdditionalServices from "./additional-services";
import GitRepoConfigCard from "./git-repo-config-card";
import InstanceRegionCards from "./instance-region-cards";
import InstanceTypeCards from "./instance-type-cards";
import NameCard from "./name-card";
import SshKeysCard from "./ssh-keys-card";

interface ProjectConfigFormProps {
  title: string;
  description: string;
  submitAction?: ReactNode;
}

export default function ProjectConfigForm({
  title,
  description,
  submitAction,
}: ProjectConfigFormProps) {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-2">{description}</p>
      </div>
      <NameCard />
      <InstanceRegionCards />
      <InstanceTypeCards />
      <GitRepoConfigCard />
      <SshKeysCard />
      <AdditionalServices />
      {submitAction}
    </div>
  );
}
