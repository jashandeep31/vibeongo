import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  chmod,
  lstat,
  mkdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { normalizeServerUrl } from "./api.js";

type FileCredentials = {
  version: 1;
  apiKeys: Record<string, unknown>;
};

const emptyCredentials = (): FileCredentials => ({ version: 1, apiKeys: {} });

export function defaultConfigPath(): string {
  const configuredHome = process.env.XDG_CONFIG_HOME;
  const configHome =
    configuredHome && isAbsolute(configuredHome)
      ? configuredHome
      : join(homedir(), ".config");
  return join(configHome, "vibeongo", "CLI", "config.json");
}

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === "ENOENT";
}

async function readCredentials(path: string): Promise<FileCredentials | null> {
  let stats;
  try {
    stats = await lstat(path);
  } catch (error) {
    if (isMissing(error)) return null;
    throw new Error(`Could not access CLI config at ${path}.`);
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error(`CLI config must be a regular file: ${path}`);
  }
  if (process.platform !== "win32" && (stats.mode & 0o077) !== 0) {
    throw new Error(
      `CLI config is readable by others. Run: chmod 600 '${path}'`,
    );
  }
  let parsed: unknown;
  try {
    const raw = await readFile(path, {
      encoding: "utf8",
      flag: constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
    });
    parsed = JSON.parse(raw);
  } catch (error) {
    if (isMissing(error)) return null;
    throw new Error(`Could not read valid JSON from CLI config at ${path}.`);
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    (parsed as Record<string, unknown>).version !== 1 ||
    !(parsed as Record<string, unknown>).apiKeys ||
    typeof (parsed as Record<string, unknown>).apiKeys !== "object" ||
    Array.isArray((parsed as Record<string, unknown>).apiKeys)
  ) {
    throw new Error(`CLI config has an invalid format: ${path}`);
  }
  return parsed as FileCredentials;
}

async function writeCredentials(
  path: string,
  credentials: FileCredentials,
): Promise<void> {
  const directory = dirname(path);
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 });
  } catch {
    throw new Error(`Could not create CLI config directory at ${directory}.`);
  }
  const temporaryPath = join(directory, `.config-${randomUUID()}.tmp`);
  try {
    await writeFile(
      temporaryPath,
      `${JSON.stringify(credentials, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      },
    );
    await chmod(temporaryPath, 0o600);
    await rename(temporaryPath, path);
  } catch {
    await unlink(temporaryPath).catch(() => {});
    throw new Error(`Could not save CLI config at ${path}.`);
  }
}

export async function saveFileApiKey(
  serverUrl: string,
  apiKey: string,
): Promise<void> {
  const origin = normalizeServerUrl(serverUrl);
  const path = defaultConfigPath();
  const credentials = (await readCredentials(path)) ?? emptyCredentials();
  credentials.apiKeys[origin] = apiKey;
  await writeCredentials(path, credentials);
}

export async function getFileApiKey(
  serverUrl: string,
): Promise<string | undefined> {
  const origin = normalizeServerUrl(serverUrl);
  const credentials = await readCredentials(defaultConfigPath());
  const key = credentials?.apiKeys[origin];
  return typeof key === "string" ? key : undefined;
}

export async function deleteFileApiKey(serverUrl: string): Promise<boolean> {
  const origin = normalizeServerUrl(serverUrl);
  const path = defaultConfigPath();
  const credentials = await readCredentials(path);
  if (!credentials || !Object.hasOwn(credentials.apiKeys, origin)) return false;
  delete credentials.apiKeys[origin];
  await writeCredentials(path, credentials);
  return true;
}
