"use client";

import { useState } from "react";
import {
  Activity,
  Box,
  Check,
  Clock,
  Copy,
  CreditCard,
  Database,
  Eye,
  EyeOff,
  Globe,
  HardDrive,
  Key,
  Network,
  Play,
  RefreshCw,
  Server,
  ShieldCheck,
  Square,
  Terminal,
  User,
} from "lucide-react";
import { Card, CardContent } from "@repo/ui/components/card";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";

// Mock data updated to match the new requirements
const MOCK_PROJECT_DATA = {
  id: "proj-1",
  name: "Production Web",
  status: "running",
  metrics: {
    uptime: "420h 15m",
    billing: {
      total: "$18.45",
      bandwidth: "$2.10",
      compute: "$16.35",
    },
  },
  config: {
    os: "ubuntu",
    system_user: {
      username: "ubuntu",
      password: "5",
      is_sudo_user: true,
    },
    packages: [
      {
        name: "docker",
        config: {
          containers: [
            {
              name: "postgres",
              compose_file_url:
                "https://l1.devsradar.com/postgres-docker-compose-file",
              filename: "postgres-docker-compose.yaml",
            },
          ],
        },
      },
      {
        name: "opencode",
        config: {
          command: "curl -fsSL https://opencode.ai/install | bash",
        },
      },
    ],
  },
};

export default function ProjectPage() {
  const project = MOCK_PROJECT_DATA;
  const [status, setStatus] = useState<"running" | "stopped">(
    project.status as any,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(project.config.system_user.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 space-y-8 p-6 md:p-8 mx-auto w-full">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {project.name}
            </h1>
            {status === "running" ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border-0">
                Running
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="text-muted-foreground border-0"
              >
                Stopped
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            <Server className="w-4 h-4" /> ID: {project.id}
          </p>
        </div>

        {/* Actions Group */}
        <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
          {status === "running" ? (
            <>
              <Button variant="outline" size="lg">
                <Terminal className="w-4 h-4 mr-2" />
                SSH
              </Button>
              <Button variant="outline" size="lg">
                <Globe className="w-4 h-4 mr-2" />
                Opencode Web
              </Button>
              <Button variant="outline" size="lg">
                <RefreshCw className="w-4 h-4 mr-2" />
                Restart
              </Button>
              <Button
                variant="destructive"
                size="lg"
                onClick={() => setStatus("stopped")}
              >
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </>
          ) : (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              size="lg"
              onClick={() => setStatus("running")}
            >
              <Play className="w-4 h-4 mr-2" />
              Start
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Side: Configuration (75%) */}
        <div className="lg:w-3/4 space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <HardDrive className="w-5 h-5 text-muted-foreground" />
            System Information
          </h2>

          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* OS & Basic Info */}
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

                {/* Credentials */}
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

          <h2 className="text-xl font-semibold flex items-center gap-2 mt-8 mb-4">
            <Box className="w-5 h-5 text-muted-foreground" />
            Installed Services
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {project.config.packages.map((pkg, idx) => (
              <Card key={idx} className="overflow-hidden">
                <div className="px-6 pb-4 border-b flex items-center gap-3">
                  <div className="p-2  rounded-md shrink-0">
                    {pkg.name === "docker" ? (
                      <Box className="w-5 h-5 text-blue-500" />
                    ) : pkg.name === "opencode" ? (
                      <Terminal className="w-5 h-5 text-orange-500" />
                    ) : (
                      <Activity className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold capitalize text-lg">
                      {pkg.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Service is installed and configured
                    </p>
                  </div>
                </div>

                <CardContent className="p-6">
                  {pkg.name === "docker" && pkg.config.containers && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Active Containers
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pkg.config.containers.map((container, cIdx) => (
                          <div
                            key={cIdx}
                            className="border rounded-lg p-4 bg-background flex flex-col gap-2"
                          >
                            <div className="flex items-center gap-2 font-semibold">
                              <Database className="w-4 h-4 text-primary" />
                              <span className="capitalize">
                                {container.name}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-2">
                              Configured via:{" "}
                              <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-xs ml-1">
                                {container.filename}
                              </code>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pkg.name === "opencode" && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500" />
                      Opencode agent is installed and ready.
                    </div>
                  )}

                  {/* Generic fallback for other packages like nodejs */}
                  {pkg.name !== "docker" && pkg.name !== "opencode" && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500" />
                      {pkg.name} is successfully installed on the system.
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Side: Usage & Billing (25%) */}
        <div className="lg:w-1/4 space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-muted-foreground" />
            Usage & Billing
          </h2>
          <Card className="bg-muted/10 border-muted">
            <CardContent className="p-6 space-y-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Total Charges
                </p>
                <p className="text-3xl font-bold">
                  {project.metrics.billing.total}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Current billing cycle
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Server className="w-4 h-4" /> Compute
                  </span>
                  <span className="font-medium">
                    {project.metrics.billing.compute}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Network className="w-4 h-4" /> Bandwidth
                  </span>
                  <span className="font-medium">
                    {project.metrics.billing.bandwidth}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Running Time
                </p>
                <p className="font-medium">{project.metrics.uptime}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
