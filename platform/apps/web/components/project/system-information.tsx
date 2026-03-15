"use client";

import { useState } from "react";
import { Check, Copy, HardDrive, Network, Key } from "lucide-react";
import { Card, CardContent } from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Project, DbInstance } from "./types";

interface SystemInformationProps {
  project: Project;
  instances: DbInstance[];
}

export function SystemInformation({
  project,
  instances,
}: SystemInformationProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const instance = instances?.[0]; // Assuming one main instance per project for now

  return (
    <div className="space-y-6">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <HardDrive className="text-muted-foreground h-5 w-5" />
        System Information
      </h2>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Public IP Address
                </p>
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  <span className="font-medium">
                    {instance?.public_ip || "Not Assigned"}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Private IP Address
                </p>
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {instance?.private_ip || "Not Assigned"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Configured SSH Keys
                </p>
                {project.config.sshKeys && project.config.sshKeys.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {project.config.sshKeys.map((key, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="bg-muted flex flex-1 items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-sm overflow-hidden">
                          <Key className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{key}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(key, `key-${idx}`)}
                          title="Copy SSH Key"
                        >
                          {copiedKey === `key-${idx}` ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No SSH keys configured.
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
