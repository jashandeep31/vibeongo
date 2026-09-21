import { useProjectsStore, useSessionsStore } from "@repo/app-store";
import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";

const CACHE_VERSION = 1;
const cacheFile = new File(Paths.document, "project-metadata-cache.json");

type Project = ReturnType<typeof useProjectsStore.getState>["projects"][number];
type Session = ReturnType<
  typeof useSessionsStore.getState
>["sessions"][number]["session"];

type ProjectMetadataCache = {
  ownerId: string;
  projects: Project[];
  savedAt: number;
  sessions: Session[];
  version: number;
};

function reviveDates<T>(value: T): T {
  if (Array.isArray(value)) return value.map(reviveDates) as T;
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      key.endsWith("_at") && typeof entry === "string"
        ? new Date(entry)
        : reviveDates(entry),
    ]),
  ) as T;
}

export async function loadProjectMetadataCache(ownerId: string) {
  if (Platform.OS === "web" || !ownerId || !cacheFile.exists) return null;

  try {
    const parsed = JSON.parse(await cacheFile.text()) as ProjectMetadataCache;
    if (
      parsed.version !== CACHE_VERSION ||
      parsed.ownerId !== ownerId ||
      !Array.isArray(parsed.projects) ||
      !Array.isArray(parsed.sessions)
    ) {
      return null;
    }
    return reviveDates(parsed);
  } catch {
    return null;
  }
}

export function saveProjectMetadataCache(
  ownerId: string,
  projects: Project[],
  sessions: Session[],
) {
  if (Platform.OS === "web" || !ownerId) return;

  try {
    cacheFile.write(
      JSON.stringify({
        ownerId,
        projects,
        savedAt: Date.now(),
        sessions,
        version: CACHE_VERSION,
      } satisfies ProjectMetadataCache),
    );
  } catch {
    // A cache write must never prevent the authoritative network sync.
  }
}
