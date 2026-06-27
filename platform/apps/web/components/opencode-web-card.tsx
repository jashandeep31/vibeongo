"use client";

import { ToolWebCard } from "@/components/tool-web-card";

interface OpencodeWebCardProps {
  domainFor8080: string | null;
  domainFor4096: string | null;
  isTerminated: boolean;
  opencodePassword?: string | null;
}

export function OpencodeWebCard({
  domainFor4096,
  isTerminated,
  opencodePassword,
}: OpencodeWebCardProps) {
  return (
    <ToolWebCard
      title="Opencode Web"
      tool="opencode"
      url={domainFor4096 ? `https://${domainFor4096}` : null}
      isTerminated={isTerminated}
      password={opencodePassword}
      passwordLabel="password"
    />
  );
}
