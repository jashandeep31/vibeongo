import {
  getProxyAuthorizationValue,
  PROXY_AUTHORIZATION_HEADER,
} from "./proxy-auth.js";

export type RuntimeFileConnection = {
  runtimeUrl: string;
  localToken: string;
  accessToken: string;
};

export type RuntimeFileEntry = {
  name: string;
  path: string;
  type: "file" | "directory";
};

export type RuntimeDirectory = {
  path: string;
  entries: RuntimeFileEntry[];
};

export type RuntimeFile = {
  content: string;
  contentType: string;
  name: string;
};

function normalizeRuntimeUrl(runtimeUrl: string) {
  const url = new URL(runtimeUrl);
  if (!url.hostname.startsWith("3101-")) {
    throw new Error("Invalid VibeOnGo runtime URL");
  }

  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function getHeaders({
  localToken,
  accessToken,
}: RuntimeFileConnection): HeadersInit {
  return {
    authorization: `Bearer ${localToken}`,
    [PROXY_AUTHORIZATION_HEADER]: getProxyAuthorizationValue(accessToken),
  };
}

async function assertResponse(response: Response, fallback: string) {
  if (response.ok) return;

  const body = await response.text();
  try {
    const payload = JSON.parse(body) as { error?: string; message?: string };
    throw new Error(payload.message ?? payload.error ?? fallback);
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(body || fallback);
    throw error;
  }
}

function createFormData(values: Record<string, string>) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

export async function getRuntimeDirectory(
  connection: RuntimeFileConnection,
  path?: string,
): Promise<RuntimeDirectory> {
  const url = new URL(`${normalizeRuntimeUrl(connection.runtimeUrl)}/fs/list`);
  if (path) url.searchParams.set("path", path);

  const response = await fetch(url, {
    headers: getHeaders(connection),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  await assertResponse(response, "Could not load directory");
  return response.json() as Promise<RuntimeDirectory>;
}

export async function getRuntimeFile(
  connection: RuntimeFileConnection,
  path: string,
): Promise<RuntimeFile> {
  const url = new URL(`${normalizeRuntimeUrl(connection.runtimeUrl)}/fs/get`);
  url.searchParams.set("path", path);

  const response = await fetch(url, {
    headers: getHeaders(connection),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  await assertResponse(response, "Could not load file");
  const payload = (await response.json()) as {
    content: string;
    contentType: string;
    name?: string;
    string?: string;
  };

  return {
    content: payload.content,
    contentType: payload.contentType,
    name: payload.name ?? payload.string ?? path.split("/").pop() ?? path,
  };
}

export async function createRuntimeFileEntry(
  connection: RuntimeFileConnection,
  path: string,
): Promise<void> {
  const response = await fetch(
    `${normalizeRuntimeUrl(connection.runtimeUrl)}/fs/create`,
    {
      method: "POST",
      headers: getHeaders(connection),
      body: createFormData({ path }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  await assertResponse(response, "Could not create file or folder");
}

export async function updateRuntimeFile(
  connection: RuntimeFileConnection,
  path: string,
  content: string,
): Promise<void> {
  const response = await fetch(
    `${normalizeRuntimeUrl(connection.runtimeUrl)}/fs`,
    {
      method: "PUT",
      headers: getHeaders(connection),
      body: createFormData({ path, content }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  await assertResponse(response, "Could not update file");
}

export async function uploadRuntimeFile(
  connection: RuntimeFileConnection,
  path: string,
  file: File,
): Promise<RuntimeFileEntry> {
  const formData = new FormData();
  formData.set("path", path);
  formData.set("file", file);

  const response = await fetch(
    `${normalizeRuntimeUrl(connection.runtimeUrl)}/fs/upload`,
    {
      method: "POST",
      headers: getHeaders(connection),
      body: formData,
      signal: AbortSignal.timeout(60_000),
    },
  );
  await assertResponse(response, "Could not upload file");
  return response.json() as Promise<RuntimeFileEntry>;
}

export async function deleteRuntimeFileEntry(
  connection: RuntimeFileConnection,
  path: string,
): Promise<void> {
  const url = new URL(`${normalizeRuntimeUrl(connection.runtimeUrl)}/fs`);
  url.searchParams.set("path", path);

  const response = await fetch(url, {
    method: "DELETE",
    headers: getHeaders(connection),
    signal: AbortSignal.timeout(10_000),
  });
  await assertResponse(response, "Could not delete file or folder");
}
