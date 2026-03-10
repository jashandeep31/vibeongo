"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  HardDrive,
  Key,
  ShieldCheck,
  Terminal,
  User,
} from "lucide-react";
import { Card, CardContent } from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Project } from "./types";

interface SystemInformationProps {
  project: Project;
}

export function SystemInformation({ project }: SystemInformationProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(project.config.system_user.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
                  Operating System
                </p>
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  <span className="font-medium capitalize">
                    {project.config.os}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Privileges
                </p>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm">
                    {project.config.system_user.is_sudo_user
                      ? "Sudo Access Granted"
                      : "Standard User"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Username
                </p>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">
                    {project.config.system_user.username}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Password
                </p>
                <div className="flex items-center gap-2">
                  <div className="bg-muted flex flex-1 items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-sm">
                    <Key className="text-muted-foreground h-3.5 w-3.5" />
                    {showPassword
                      ? project.config.system_user.password
                      : "••••••••••••"}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copyToClipboard}
                    title="Copy password"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
