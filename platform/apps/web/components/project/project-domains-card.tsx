"use client";

import { Globe, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { useGetProjectDomainsById } from "@/hooks/use-project";

interface ProjectDomainsCardProps {
  projectId: string;
}

export function ProjectDomainsCard({ projectId }: ProjectDomainsCardProps) {
  const { data, isLoading } = useGetProjectDomainsById(projectId);
  const proxyDomains = data?.proxy_domains ?? [];

  return (
    <div className="space-y-6">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <Globe className="text-muted-foreground h-5 w-5" />
        Domains
      </h2>

      <Card>
        <CardHeader>
          <CardTitle>Project Domains</CardTitle>
          <CardDescription>
            Domains mapped to this project and their target ports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground text-sm">
              Loading domains...
            </div>
          ) : proxyDomains.length > 0 ? (
            <div className="space-y-3">
              {proxyDomains.map((domainRow) => (
                <div
                  key={domainRow.id}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                >
                  <a
                    href={`https://${domainRow.domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 items-center gap-2 text-sm text-blue-500 hover:underline"
                  >
                    <Globe className="h-4 w-4 shrink-0" />
                    <span className="truncate">{domainRow.domain}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                  <span className="bg-muted text-muted-foreground shrink-0 rounded border px-2 py-0.5 font-mono text-xs">
                    :{domainRow.target_port}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">
              No domains are configured for this project.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
