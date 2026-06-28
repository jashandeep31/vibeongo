"use client";

import { ToolWebCard } from "@/components/tool-web-card";

interface T3CodeCardProps {
  domainFor3773: string | null;
  isTerminated: boolean;
}

export function T3CodeCard({ domainFor3773, isTerminated }: T3CodeCardProps) {
  return (
    <ToolWebCard
      title="T3 Code"
      tool="codex"
      url={domainFor3773 ? `https://${domainFor3773}` : null}
      isTerminated={isTerminated}
      canRequestPassword
    />
  );
}
