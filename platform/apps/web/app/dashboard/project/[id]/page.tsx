"use client";

import { useState } from "react";
import { ProjectHeader } from "../../../../components/project/project-header";
import { SystemInformation } from "../../../../components/project/system-information";
import { ProjectTabs } from "../../../../components/project/project-tabs";
import { UsageBilling } from "../../../../components/project/usage-billing";

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
    git_config: [
      {
        repo_url: "https://github.com/vibeongo/platform.git",
        branch: "main",
        path: "/var/www/platform",
      },
      {
        repo_url: "https://github.com/vibeongo/docs.git",
        branch: "production",
        path: "/var/www/docs",
      },
    ],
    env_configs: [
      {
        path: "/var/www/platform/.env",
        data: "DATABASE_URL=postgres://user:pass@localhost:5432/db\nAPI_KEY=sk_test_1234567890abcdef\nNODE_ENV=production",
      },
      {
        path: "/var/www/docs/.env.local",
        data: "NEXT_PUBLIC_SITE_URL=https://docs.vibeongo.com",
      },
    ],
  },
};

export default function ProjectPage() {
  const project = MOCK_PROJECT_DATA;
  const [status, setStatus] = useState<"running" | "stopped">(
    project.status as "running" | "stopped",
  );

  return (
    <div className="flex-1 space-y-8 p-6 md:p-8 mx-auto w-full">
      {/* Header Section */}
      <ProjectHeader project={project} status={status} setStatus={setStatus} />

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Side: Configuration (75%) */}
        <div className="lg:w-3/4 space-y-6">
          <SystemInformation project={project} />
          <ProjectTabs project={project} />
        </div>

        {/* Right Side: Usage & Billing (25%) */}
        <div className="lg:w-1/4 space-y-6">
          <UsageBilling project={project} />
        </div>
      </div>
    </div>
  );
}
