import { ApiError, apiFetch, apiRequest } from "@/lib/api";

export type ProjectDomain = {
  id: string;
  domain: string;
  target_port: number;
  is_editable: boolean;
  allow_all_ips: boolean;
};

export type AllowedIp = {
  id: string;
  ip: string;
};

export type ProjectDomains = {
  id: string;
  project_id: string;
  target_instance_id: string | null;
  proxy_domains: ProjectDomain[];
  allowed_ips: AllowedIp[];
};

async function action(path: string, init: RequestInit) {
  const response = await apiFetch(path, init);
  const body = (await response.json().catch(() => null)) as {
    message?: string;
    error?: string;
  } | null;
  if (!response.ok) {
    throw new ApiError(
      body?.message ?? body?.error ?? `Request failed (${response.status})`,
      response.status,
    );
  }
}

export function getProjectDomains(projectId: string) {
  return apiRequest<ProjectDomains>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/domains`,
  );
}

export function assignProjectDomains(projectId: string, instanceId: string) {
  return action(
    `/api/v1/projects/${encodeURIComponent(projectId)}/routing/target-instance`,
    {
      method: "PATCH",
      body: JSON.stringify({ instanceId }),
    },
  );
}

export function updateProjectDomain(
  projectId: string,
  domainId: string,
  update: { allow_all_ips?: boolean; target_port?: number },
) {
  return action(
    `/api/v1/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domainId)}`,
    { method: "PATCH", body: JSON.stringify(update) },
  );
}

export function addProjectAllowedIp(projectId: string, ip: string) {
  return action(
    `/api/v1/projects/${encodeURIComponent(projectId)}/allowed-ips`,
    { method: "POST", body: JSON.stringify({ ip }) },
  );
}

export function deleteProjectAllowedIps(projectId: string, ids: string[]) {
  return action(
    `/api/v1/projects/${encodeURIComponent(projectId)}/allowed-ips`,
    { method: "DELETE", body: JSON.stringify({ ids }) },
  );
}

export async function getCurrentIp(domain: string) {
  const response = await fetch(`https://${domain}/proxy/my-ip`);
  if (!response.ok) throw new Error("Could not determine this device's IP");
  const body = (await response.json()) as { ip?: string };
  return body.ip?.trim() ?? "";
}
