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
      <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
        <HardDrive className="w-5 h-5 text-muted-foreground" />
        System Information
      </h2>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Operating System
                </p>
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  <span className="capitalize font-medium">
                    {project.config.os}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Privileges
                </p>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
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
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Username
                </p>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium">
                    {project.config.system_user.username}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Password
                </p>
                <div className="flex items-center gap-2">
                  <div className="font-mono text-sm bg-muted px-3 py-1.5 rounded-md border flex-1 flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-muted-foreground" />
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
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copyToClipboard}
                    title="Copy password"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
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
