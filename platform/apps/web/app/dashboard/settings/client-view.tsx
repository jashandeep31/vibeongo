"use client";

import { useSshKeys } from "@/hooks/use-shh-keys";

export default function ClientView() {
  const { data: sshKeys } = useSshKeys();
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <div className="mt-8">
        <h2 className="text-lg  font-semibold text-muted-foreground">
          SSH keys
        </h2>
      </div>
    </div>
  );
}
