"use client";

import { FormEvent, useState } from "react";
import { Globe, ExternalLink, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
  useAddAllowedIpToProject,
  useDeleteAllowedIpFromProject,
  useGetProjectDomainsById,
} from "@/hooks/use-project";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";

interface ProjectDomainsCardProps {
  projectId: string;
}

export function ProjectDomainsCard({ projectId }: ProjectDomainsCardProps) {
  const [newIp, setNewIp] = useState("");
  const [deletingIpId, setDeletingIpId] = useState<string | null>(null);
  const { data, isLoading } = useGetProjectDomainsById(projectId);
  const addAllowedIpMutation = useAddAllowedIpToProject();
  const deleteAllowedIpMutation = useDeleteAllowedIpFromProject();
  const proxyDomains = data?.proxy_domains ?? [];
  const allowedIps = data?.allowed_ips ?? [];

  const handleAddIp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ip = newIp.trim();

    if (!ip) {
      toast.error("Please enter an IP address");
      return;
    }

    const toastId = toast.loading("Adding allowed IP...");
    try {
      await addAllowedIpMutation.mutateAsync({ id: projectId, ip });
      setNewIp("");
      toast.success("Allowed IP added", { id: toastId });
    } catch {
      toast.error("Failed to add allowed IP", { id: toastId });
    }
  };

  const handleDeleteIp = async (ipId: string) => {
    const toastId = toast.loading("Removing allowed IP...");
    setDeletingIpId(ipId);

    try {
      await deleteAllowedIpMutation.mutateAsync({ id: projectId, ipId });
      toast.success("Allowed IP removed", { id: toastId });
    } catch {
      toast.error("Failed to remove allowed IP", { id: toastId });
    } finally {
      setDeletingIpId(null);
    }
  };

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
            {data?.target_instance_id ? (
              <span>
                project is targeted to{" "}
                <Link
                  className="text-blue-500 hover:underline"
                  href={`http://localhost:3000/projects/${projectId}/instances/${data.target_instance_id}`}
                >
                  Instance
                </Link>
              </span>
            ) : (
              "project is not targeted to any instance"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground text-sm">Loading domains...</div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                {proxyDomains.length > 0 ? (
                  proxyDomains.map((domainRow) => (
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
                  ))
                ) : (
                  <div className="text-muted-foreground text-sm">
                    No domains are configured for this project.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium">Allowed IPs</h3>
                  <span className="bg-muted text-muted-foreground rounded border px-2 py-0.5 text-xs">
                    {allowedIps.length}
                  </span>
                </div>

                <form onSubmit={handleAddIp}>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      name="ip"
                      placeholder="Enter IP address (e.g. 203.0.113.10)"
                      autoComplete="off"
                      value={newIp}
                      onChange={(event) => setNewIp(event.target.value)}
                      disabled={addAllowedIpMutation.isPending}
                    />
                    <Button
                      type="submit"
                      className="sm:w-auto"
                      disabled={addAllowedIpMutation.isPending}
                    >
                      {addAllowedIpMutation.isPending ? "Adding..." : "Add IP"}
                    </Button>
                  </div>
                </form>

                {allowedIps.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {allowedIps.map((allowedIp) => (
                      <div
                        key={allowedIp.id}
                        className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-xs"
                      >
                        <span>{allowedIp.ip}</span>
                        <ConfirmationDialog
                          title="Remove allowed IP"
                          description={`Are you sure you want to remove ${allowedIp.ip} from the allowlist?`}
                          confirmText="Remove"
                          isDestructive
                          onConfirm={() => {
                            void handleDeleteIp(allowedIp.id);
                          }}
                        >
                          <button
                            type="button"
                            className="hover:bg-background/80 rounded p-0.5"
                            aria-label={`Remove ${allowedIp.ip}`}
                            disabled={deletingIpId === allowedIp.id}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </ConfirmationDialog>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    No allowed IPs configured.
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
